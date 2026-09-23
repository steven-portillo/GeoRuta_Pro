import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Pago } from "../Models/Pago.model.ts";
import { EsquemaCrearIntencion } from "../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../Helpers/ContextoAuth.ts";
import { crearPaymentIntent, obtenerPaymentIntent, verificarFirmaWebhook } from "../Helpers/Stripe.ts";
import { enviarReciboEmail } from "../Helpers/EnviarRecibo.ts";

const TASA_CAMBIO_USD = Number(Deno.env.get("STRIPE_TASA_CAMBIO_USD") ?? 4000);

// POST /pago/crear-intencion
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

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPago = new Pago();
    const pedido = await ObjPago.ObtenerPedidoPendiente(resultado.data.idPedido, idUsuario as number);

    if (!pedido.success || !pedido.data) {
      response.status = 404;
      response.body = { success: false, message: pedido.message };
      return;
    }

    const totalCop = pedido.data.total;
    const totalUsd = Math.round((totalCop / TASA_CAMBIO_USD) * 100) / 100;
    let montoCentavos = Math.round(totalUsd * 100);
    if (montoCentavos < 50) montoCentavos = 50; // minimo exigido por Stripe

    const intent = await crearPaymentIntent(montoCentavos, resultado.data.idPedido);
    await ObjPago.GuardarReferenciaStripe(resultado.data.idPedido, intent.id);

    response.status = 200;
    response.body = {
      success: true,
      clientSecret: intent.clientSecret,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
      totalUsd,
      totalCop,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible iniciar el pago",
    };
  }
};

// GET /pago/exito/:idPedido — el navegador del cliente llega aqui al volver de Stripe
export const confirmarExito = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idPedido = Number(params.idPedido);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Pedido inválido" };
      return;
    }

    const ObjPago = new Pago();
    const referencia = await ObjPago.ObtenerReferenciaPago(idPedido);

    if (referencia.success && referencia.data) {
      const intent = await obtenerPaymentIntent(referencia.data);
      if (intent.status === "succeeded") {
        await ObjPago.MarcarAprobado(idPedido, intent.id);
        enviarReciboEmail(idPedido); // fire-and-forget: no se espera, no bloquea la respuesta
      }
    }

    response.status = 200;
    response.body = { success: true, idPedido };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible confirmar el pago" };
  }
};

// POST /pago/webhook — lo llama Stripe directamente, sin JWT
export const webhook = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const payloadCrudo = await request.body.text();
    const firmaHeader = request.headers.get("Stripe-Signature") ?? "";
    const secreto = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

    const firmaValida = await verificarFirmaWebhook(payloadCrudo, firmaHeader, secreto);
    if (!firmaValida) {
      response.status = 400;
      response.body = { success: false, message: "Firma inválida" };
      return;
    }

    const evento = JSON.parse(payloadCrudo);

    if (evento.type === "payment_intent.succeeded") {
      const intent = evento.data?.object;
      const idPedido = Number(intent?.metadata?.id_pedido);

      if (idPedido) {
        const ObjPago = new Pago();
        await ObjPago.MarcarAprobado(idPedido, intent.id);
        enviarReciboEmail(idPedido);
      }
    }

    response.status = 200;
    response.body = { received: true };
  } catch (error) {
    console.error(error);
    response.status = 400;
    response.body = { success: false, message: "Error procesando el webhook" };
  }
};

// GET /pago/simular/:idPedido — SOLO PRUEBAS. A diferencia del original, aqui queda protegida
// con JWT + rol CLIENTE (el original la dejaba completamente abierta, lo cual es riesgoso)
export const simularPago = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idPedido = Number(params.idPedido);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Pedido inválido" };
      return;
    }

    const ObjPago = new Pago();
    await ObjPago.MarcarAprobado(idPedido, `SIMULADO-${Date.now()}`);
    enviarReciboEmail(idPedido);

    response.status = 200;
    response.body = { success: true, message: "Pago simulado aprobado" };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible simular el pago" };
  }
};