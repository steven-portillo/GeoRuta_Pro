import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Pago } from "../Models/Pago.model.ts";
import { EsquemaCrearIntencion } from "../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../Helpers/ContextoAuth.ts";
import {
  construirUrlCheckout,
  type EventoWompi,
  generarReferencia,
  idPedidoDeReferencia,
  obtenerTransaccionPorId,
  pesosACentavos,
  verificarChecksumEvento,
} from "../Helpers/Wompi.ts";
import { enviarReciboEmail } from "../Helpers/EnviarRecibo.ts";

type EstadoPago = "aprobado" | "rechazado" | "pendiente";

interface DatosTransaccion {
  id: string;
  status: string;
  amount_in_cents: number;
}

// logica unica para webhook y confirmacion del navegador: aplica el estado de wompi al pedido.
// solo aprueba si el monto cobrado coincide con el total real del pedido en la base de datos
async function aplicarTransaccion(idPedido: number, transaccion: DatosTransaccion): Promise<EstadoPago> {
  const ObjPago = new Pago();

  if (transaccion.status === "APPROVED") {
    const total = await ObjPago.ObtenerTotalPedido(idPedido);
    if (!total.success || total.data === undefined) throw new Error(total.message);

    if (pesosACentavos(total.data) !== Number(transaccion.amount_in_cents)) {
      console.error(
        `pago ${transaccion.id}: monto ${transaccion.amount_in_cents} no coincide con el pedido ${idPedido}`,
      );
      return "pendiente"; // no se aprueba un pago por un valor distinto al del pedido
    }

    const resultado = await ObjPago.MarcarAprobado(idPedido, transaccion.id);
    if (!resultado.success) throw new Error(resultado.message);

    // el recibo solo se envia la primera vez que el pedido pasa a pagado
    if (resultado.data?.nuevo) enviarReciboEmail(idPedido);
    return "aprobado";
  }

  if (["DECLINED", "VOIDED", "ERROR"].includes(transaccion.status)) {
    await ObjPago.MarcarRechazado(idPedido, transaccion.id);
    return "rechazado";
  }

  return "pendiente"; // PENDING u otro estado intermedio: se espera al webhook o a otra consulta
}

// POST /pago/crear-intencion — devuelve la url del checkout de wompi a la que se redirige al cliente
export const crearIntencion = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCrearIntencion.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const { idPedido } = resultado.data;
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPago = new Pago();
    const pedido = await ObjPago.ObtenerPedidoPendiente(idPedido, idUsuario as number);

    if (!pedido.success || !pedido.data) {
      response.status = 404;
      response.body = { success: false, message: pedido.message };
      return;
    }

    const totalCop = Number(pedido.data.total);
    const referencia = generarReferencia(idPedido);

    // a esta pagina vuelve el cliente despues de pagar; wompi le agrega ?id=<id de la transaccion>
    const urlFront = Deno.env.get("FRONTEND_URL") ?? "http://localhost:4321";
    const urlRetorno = `${urlFront}/cliente/pago/resultado?pedido=${idPedido}`;

    const urlCheckout = await construirUrlCheckout(referencia, pesosACentavos(totalCop), urlRetorno);

    // la referencia se guarda ANTES de redirigir, para que el webhook pueda ubicar el pedido
    const guardado = await ObjPago.GuardarReferencia(idPedido, referencia);
    if (!guardado.success) {
      response.status = 500;
      response.body = { success: false, message: guardado.message };
      return;
    }

    response.status = 200;
    response.body = { success: true, urlCheckout, referencia, totalCop };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible iniciar el pago",
    };
  }
};

// GET /pago/exito/:idPedido — el cliente llega aqui al volver de wompi. se consulta el estado real
// GET /pago/exito/:idPedido?transaccion=<id> — el cliente llega aqui al volver de wompi.
// se consulta el estado real de esa transaccion directamente a wompi
export const confirmarExito = async (ctx: RouterContext<string>) => {
  const { request, response, params } = ctx;
  try {
    const idPedido = Number(params.idPedido);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Pedido inválido" };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPago = new Pago();
    const pago = await ObjPago.ObtenerPagoDePedido(idPedido, idUsuario as number);

    if (!pago.success || !pago.data) {
      response.status = 404;
      response.body = { success: false, message: pago.message };
      return;
    }

    // si el webhook u otra consulta ya aprobo el pago, no hay nada mas que verificar
    if (pago.data.estadoPago === "aprobado") {
      response.status = 200;
      response.body = { success: true, idPedido, estado: "aprobado" };
      return;
    }

    let estado: EstadoPago = pago.data.estadoPago === "rechazado" ? "rechazado" : "pendiente";

        const idTransaccion = request.url.searchParams.get("transaccion");
    console.log("wompi retorno: id recibido =", idTransaccion, "| pedido =", idPedido); // temporal

    if (idTransaccion) {
      const transaccion = await obtenerTransaccionPorId(idTransaccion);

      // temporal: compara lo que dice wompi contra lo que hay guardado
      console.log("wompi retorno:", {
        status: transaccion?.status,
        referenciaWompi: transaccion?.reference,
        referenciaGuardada: pago.data.referencia,
        montoWompi: transaccion?.amount_in_cents,
      });

      // la transaccion debe pertenecer al intento de pago guardado para ESTE pedido
      if (transaccion && transaccion.reference === pago.data.referencia) {
        estado = await aplicarTransaccion(idPedido, transaccion);
      } else {
        console.warn(`transaccion ${idTransaccion} no corresponde al pago del pedido ${idPedido}`);
      }
    }

    response.status = 200;
    response.body = { success: true, idPedido, estado };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible confirmar el pago" };
  }
};
// POST /pago/webhook — lo llama wompi directamente, sin jwt. se valida por checksum
export const webhook = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const evento = JSON.parse(await request.body.text()) as EventoWompi;

    if (!(await verificarChecksumEvento(evento))) {
      response.status = 400;
      response.body = { success: false, message: "Checksum inválido" };
      return;
    }

    if (evento.event === "transaction.updated") {
      const transaccion = (evento.data as { transaction?: Record<string, unknown> }).transaction;
      const idPedido = idPedidoDeReferencia(String(transaccion?.reference ?? ""));

      if (transaccion && idPedido) {
        await aplicarTransaccion(idPedido, {
          id: String(transaccion.id),
          status: String(transaccion.status),
          amount_in_cents: Number(transaccion.amount_in_cents),
        });
      }
    }

    // cualquier evento valido se responde 200 para que wompi no lo reintente
    response.status = 200;
    response.body = { received: true };
  } catch (error) {
    console.error(error);
    // 500: wompi reintenta hasta 3 veces en 24 horas, util si fallo la base de datos
    response.status = 500;
    response.body = { success: false, message: "Error procesando el webhook" };
  }
};

// GET /pago/simular/:idPedido — SOLO PRUEBAS. queda bloqueada si NODE_ENV es production
export const simularPago = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    if (Deno.env.get("NODE_ENV") === "production") {
      response.status = 404;
      response.body = { success: false, message: "No disponible" };
      return;
    }

    const idPedido = Number(params.idPedido);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Pedido inválido" };
      return;
    }

    const ObjPago = new Pago();
    const resultado = await ObjPago.MarcarAprobado(idPedido, `SIMULADO-${Date.now()}`);
    if (resultado.data?.nuevo) enviarReciboEmail(idPedido);

    response.status = 200;
    response.body = { success: true, message: "Pago simulado aprobado" };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible simular el pago" };
  }
};