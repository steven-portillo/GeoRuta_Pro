import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { PedidoProveedor } from "../../Model/Proveedor/PedidoModel.ts";

function idProveedor(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const listarPedidosProveedor = async (ctx: Context) => {
  try {
    const pedidos = await PedidoProveedor.ListarPedidos(idProveedor(ctx));
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedidos };
  } catch (error) {
    console.error("Error listar pedidos del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const obtenerPedidoProveedor = async (
  ctx: RouterContext<"/api/proveedor/pedidos/:id">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de pedido inválido" };
      return;
    }
    const pedido = await PedidoProveedor.ObtenerDetalle(
      idProveedor(ctx),
      id_pedido,
    );
    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedido };
  } catch (error) {
    console.error("Error obtener pedido del proveedor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
