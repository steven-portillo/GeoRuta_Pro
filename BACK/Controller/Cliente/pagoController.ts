import { Context } from "../../Dependencies/dependencias.ts";
import {
  generarFirmaIntegridad,
  getWompiPublicKey,
  getWompiRedirectUrl,
  validarConfiguracionCheckoutWompi,
} from "../../Helpers/wompi.ts";
import { PedidoCliente } from "../../Model/Cliente/PedidoClienteModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const crearCheckoutWompi = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Solicitud inválida" };
      return;
    }
    const data = body as Record<string, unknown>;
    const id_direccion = Number(data.id_direccion);
    const observaciones = data.observaciones === undefined ||
        data.observaciones === null
      ? undefined
      : String(data.observaciones).trim();
    if (
      !Number.isSafeInteger(id_direccion) || id_direccion <= 0 ||
      (observaciones !== undefined && observaciones.length > 2000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Dirección u observaciones inválidas",
      };
      return;
    }

    const publicKey = getWompiPublicKey();
    validarConfiguracionCheckoutWompi();
    const reference = `georuta_${crypto.randomUUID().replaceAll("-", "")}`;
    const resultado = await PedidoCliente.CrearDesdeCarrito(
      idCliente(ctx),
      id_direccion,
      observaciones || undefined,
      "online",
      reference,
    );
    if (!resultado.success) {
      ctx.response.status = 400;
      ctx.response.body = resultado;
      return;
    }

    const currency = "COP";
    const amountInCents = Math.round(Number(resultado.total) * 100);
    const integrity = await generarFirmaIntegridad(
      reference,
      amountInCents,
      currency,
    );
    const redirectUrl = getWompiRedirectUrl();
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      data: {
        id_pedido: resultado.id_pedido,
        publicKey,
        currency,
        amountInCents,
        reference,
        signature: { integrity },
        ...(redirectUrl ? { redirectUrl } : {}),
      },
    };
  } catch (error) {
    console.error("Error creando checkout Wompi:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo preparar el pago",
    };
  }
};
