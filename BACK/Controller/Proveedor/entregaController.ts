import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { notificarClienteCambioPedido } from "../../Helpers/pedidoEmails.ts";
import { EntregaProveedor } from "../../Model/Proveedor/EntregaModel.ts";

function idProveedor(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const iniciarEntregasProveedor = async (ctx: Context) => {
  try {
    const resultado = await EntregaProveedor.IniciarEntregas(idProveedor(ctx));
    if (resultado.success && resultado.id_pedidos) {
      for (const id_pedido of resultado.id_pedidos) {
        await notificarClienteCambioPedido(id_pedido, "En transito");
      }
    }
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error iniciar entregas del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const confirmarEntregaProveedor = async (
  ctx: RouterContext<"/api/proveedor/pedidos/:id/confirmar-entrega">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    const body: unknown = await ctx.request.body.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Solicitud inválida" };
      return;
    }
    const data = body as Record<string, unknown>;
    const codigo_entrega = data.codigo_entrega;
    const pago_recibido = data.pago_recibido;
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      typeof codigo_entrega !== "string" ||
      !/^\d{4}$/.test(codigo_entrega.trim()) ||
      (pago_recibido !== undefined && typeof pago_recibido !== "boolean")
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID, código de entrega o confirmación de pago inválidos",
      };
      return;
    }

    const resultado = await EntregaProveedor.ConfirmarEntrega(
      idProveedor(ctx),
      id_pedido,
      codigo_entrega.trim(),
      pago_recibido,
    );
    if (resultado.success === true) {
      await notificarClienteCambioPedido(id_pedido, "Entregado");
    }
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error confirmar entrega del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const reemitirCodigoEntregaProveedor = async (
  ctx: RouterContext<"/api/proveedor/pedidos/:id/nuevo-codigo-entrega">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de pedido inválido" };
      return;
    }
    const resultado = await EntregaProveedor.ReemitirCodigoEntrega(
      idProveedor(ctx),
      id_pedido,
    );
    if (resultado.success === true) {
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message:
          "Se generó el nuevo código. El cliente podrá verlo al consultar el pedido desde su cuenta.",
      };
      return;
    }
    ctx.response.status = 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error reemitir código de entrega del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cancelarEntregaProveedor = async (
  ctx: RouterContext<"/api/proveedor/pedidos/:id/cancelar-entrega">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    const body: unknown = await ctx.request.body.json();
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      typeof body !== "object" || body === null || Array.isArray(body)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de pedido o solicitud inválidos",
      };
      return;
    }
    const motivo = (body as Record<string, unknown>).motivo;
    if (
      typeof motivo !== "string" || motivo.trim().length < 3 ||
      motivo.trim().length > 1000
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Indica un motivo de cancelación de 3 a 1000 caracteres",
      };
      return;
    }

    const resultado = await EntregaProveedor.CancelarEntrega(
      idProveedor(ctx),
      id_pedido,
      motivo.trim(),
    );
    if (resultado.success) {
      await notificarClienteCambioPedido(
        id_pedido,
        "cancelado",
        motivo.trim(),
      );
    }
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error cancelar entrega del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
