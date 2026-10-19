import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import {
  generarFirmaIntegridad,
  getWompiBaseUrl,
  getWompiPrivateKey,
  getWompiPublicKey,
} from "../../Helpers/wompi.ts";
import { PagoModel } from "../../Model/Pagos/pagoModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const crearIntencionPago = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();
    const id_pedido = Number(body.idPedido ?? body.id_pedido);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      response.status = 400;
      response.body = {
        success: false,
        message: "ID de pedido inválido",
      };
      return;
    }

    const pago = await PagoModel.ObtenerDatosCheckout(
      id_pedido,
      idCliente(ctx),
    );
    if (!pago || pago.metodo_pago !== "online") {
      response.status = 404;
      response.body = {
        success: false,
        message: "No se encontró un pedido online pendiente para esta cuenta",
      };
      return;
    }
    if (pago.estado_pago === "aprobado") {
      response.status = 409;
      response.body = {
        success: false,
        message: "El pedido ya tiene el pago confirmado",
      };
      return;
    }

    const amountInCents = Math.round(Number(pago.total) * 100);
    const reference = `georuta_${id_pedido}_${crypto.randomUUID()}`;
    const currency = "COP";
    const guardada = await PagoModel.GuardarReferencia(
      id_pedido,
      idCliente(ctx),
      reference,
    );
    if (!guardada) {
      response.status = 409;
      response.body = {
        success: false,
        message: "El pago ya no está disponible para iniciar",
      };
      return;
    }

    const signature = await generarFirmaIntegridad(
      reference,
      amountInCents,
      currency,
    );

    response.status = 200;
    response.body = {
      success: true,
      publicKey: getWompiPublicKey(),
      currency,
      amountInCents,
      reference,
      signature,
    };
  } catch (error) {
    console.error("Error crear intención de pago Wompi:", error);
    response.status = 500;
    response.body = { success: false, message: "Error en el servidor" };
  }
};

export const confirmarPago = async (
  ctx: RouterContext<"/api/cliente/pago/confirmar/:idPedido">,
) => {
  try {
    const id_pedido = Number(ctx.params.idPedido);
    const body = await ctx.request.body.json();
    const id_transaccion = String(body.transactionId ?? body.id_transaccion ?? "");
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      !id_transaccion || id_transaccion.length > 100
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Pedido o transacción inválidos",
      };
      return;
    }

    const respuestaWompi = await fetch(
      `${getWompiBaseUrl()}/transactions/${encodeURIComponent(id_transaccion)}`,
      { headers: { Authorization: `Bearer ${getWompiPrivateKey()}` } },
    );
    if (!respuestaWompi.ok) {
      console.error("Wompi rechazó la consulta de transacción:", respuestaWompi.status);
      ctx.response.status = 502;
      ctx.response.body = {
        success: false,
        message: "No fue posible verificar el pago con Wompi",
      };
      return;
    }

    const resultadoWompi = await respuestaWompi.json();
    const transaccion = resultadoWompi.data;
    if (!transaccion || transaccion.status !== "APPROVED") {
      ctx.response.status = 409;
      ctx.response.body = {
        success: false,
        message: `El pago aún no está aprobado (${transaccion?.status ?? "desconocido"})`,
      };
      return;
    }

    const pago = await PagoModel.ObtenerDatosCheckout(
      id_pedido,
      idCliente(ctx),
    );
    if (!pago) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }
    const referencia = String(transaccion.reference ?? "");
    const amountInCents = Math.round(Number(pago.total) * 100);
    if (
      transaccion.currency !== "COP" ||
      Number(transaccion.amount_in_cents) !== amountInCents ||
      !referencia.startsWith(`georuta_${id_pedido}_`)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Los datos verificados por Wompi no coinciden con el pedido",
      };
      return;
    }

    const confirmado = await PagoModel.ConfirmarPago({
      id_pedido,
      id_cliente: idCliente(ctx),
      referencia,
      transaccion: id_transaccion,
      monto: Number(pago.total),
      respuesta: JSON.stringify(resultadoWompi),
    });
    ctx.response.status = confirmado.success ? 200 : 400;
    ctx.response.body = confirmado;
  } catch (error) {
    console.error("Error al verificar el pago Wompi:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno al verificar el pago",
    };
  }
};

export const listarPagosAdmin = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const resumen = await PagoModel.ResumenAdmin(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      pagos: resumen.pagos.map((pago: Record<string, unknown>) => ({
        ...pago,
        id: Number(pago.id),
        idPedido: Number(pago.idPedido),
        monto: Number(pago.monto),
        fecha: pago.fecha ? new Date(String(pago.fecha)).toISOString() : null,
      })),
      metricas: {
        saldoTotal: Number(resumen.metricas?.saldoTotal ?? 0),
        pagosMes: Number(resumen.metricas?.pagosMes ?? 0),
        pagosPendientes: Number(resumen.metricas?.pagosPendientes ?? 0),
        ticketPromedio: Number(resumen.metricas?.ticketPromedio ?? 0),
        totalAprobados: Number(resumen.metricas?.totalAprobados ?? 0),
        totalRechazados: Number(resumen.metricas?.totalRechazados ?? 0),
      },
      serieDiaria: resumen.serieDiaria.map(
        (dia: { fecha: string; total: number }) => ({
          fecha: String(dia.fecha),
          total: Number(dia.total),
        }),
      ),
    };
  } catch (error) {
    console.error("Error al cargar resumen de pagos:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar el resumen de pagos",
    };
  }
};