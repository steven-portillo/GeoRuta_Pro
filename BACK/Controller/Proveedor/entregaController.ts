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
    const body = await ctx.request.body.json();
    const codigo_entrega = String(body.codigo_entrega ?? "").trim();
    const pago_recibido = body.pago_recibido;
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      !/^\d{4}$/.test(codigo_entrega) ||
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
      codigo_entrega,
      pago_recibido,
    );
    if (resultado.success) {
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
