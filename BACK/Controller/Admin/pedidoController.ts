import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Pedido } from "../../Model/Admin/PedidoModel.ts";

/** GET /api/admin/pedidos */
export const listarPedidos = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const pedidos = await Pedido.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedidos };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** GET /api/admin/pedidos/:id */
export const obtenerPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const pedido = await Pedido.ObtenerDetalle(id_pedido, usuario.id_empresa);
    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedido };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/pedidos/:id/asignar */
export const asignarProveedor = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/asignar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const id_proveedor = Number(body.id_proveedor);
    const notas = body.notas ? String(body.notas).trim() : undefined;

    if (!id_proveedor) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "id_proveedor es obligatorio",
      };
      return;
    }

    const resultado = await Pedido.AsignarProveedor(
      id_pedido,
      usuario.id_empresa,
      id_proveedor,
      notas,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/pedidos/:id/cancelar */
export const cancelarPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/cancelar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number; sub: string };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const motivo = String(body.motivo ?? "").trim();

    if (!motivo) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "El motivo es obligatorio",
      };
      return;
    }

    const id_usuario = Number(usuario.sub);
    const resultado = await Pedido.Cancelar(
      id_pedido,
      usuario.id_empresa,
      id_usuario,
      motivo,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
