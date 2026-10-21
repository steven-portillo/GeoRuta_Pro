import { Context } from "../../Dependencies/dependencias.ts";
import { notificarClienteCambioPedido } from "../../Helpers/pedidoEmails.ts";
import { verificarChecksumEvento } from "../../Helpers/wompi.ts";
import { TransaccionWompi, WompiModel } from "../../Model/Pagos/WompiModel.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function esTransaccionWompi(value: unknown): value is TransaccionWompi {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 &&
    value.id.length <= 100 &&
    typeof value.reference === "string" && value.reference.length > 0 &&
    value.reference.length <= 100 &&
    typeof value.status === "string" && value.status.length <= 30 &&
    Number.isSafeInteger(value.amount_in_cents) &&
    Number(value.amount_in_cents) > 0 &&
    typeof value.currency === "string" && value.currency.length === 3;
}

export const recibirWebhookWompi = async (ctx: Context) => {
  try {
    const body: unknown = await ctx.request.body.json();
    if (!isRecord(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Evento inválido" };
      return;
    }

    const validChecksum = await verificarChecksumEvento(body);
    const headerChecksum = ctx.request.headers.get("X-Event-Checksum");
    const bodyChecksum = isRecord(body.signature) &&
        typeof body.signature.checksum === "string"
      ? body.signature.checksum
      : undefined;
    if (
      !validChecksum ||
      (headerChecksum &&
        bodyChecksum?.toLowerCase() !== headerChecksum.toLowerCase())
    ) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "Firma del evento Wompi inválida",
      };
      return;
    }

    if (body.event !== "transaction.updated") {
      ctx.response.status = 200;
      ctx.response.body = { received: true, ignored: true };
      return;
    }
    if (!isRecord(body.data) || !esTransaccionWompi(body.data.transaction)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Datos de transacción Wompi inválidos",
      };
      return;
    }

    const transaccion = body.data.transaction;
    const resultado = await WompiModel.ProcesarTransaccion(
      transaccion,
      JSON.stringify({
        event: body.event,
        transaction: {
          id: transaccion.id,
          reference: transaccion.reference,
          status: transaccion.status,
          amount_in_cents: transaccion.amount_in_cents,
          currency: transaccion.currency,
        },
      }),
    );
    if (resultado.accion === "aprobado") {
      await notificarClienteCambioPedido(resultado.id_pedido, "confirmado");
    } else if (resultado.accion === "rechazado") {
      await notificarClienteCambioPedido(
        resultado.id_pedido,
        "cancelado",
        resultado.motivo,
      );
    }
    ctx.response.status = 200;
    ctx.response.body = { received: true };
  } catch (error) {
    console.error("Error procesando webhook Wompi:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo procesar el evento",
    };
  }
};
