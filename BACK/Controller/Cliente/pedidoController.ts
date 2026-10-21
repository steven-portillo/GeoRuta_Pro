import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { PedidoCliente } from "../../Model/Cliente/PedidoClienteModel.ts";
import { notificarClienteCambioPedido } from "../../Helpers/pedidoEmails.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const listarPedidosCliente = async (ctx: Context) => {
  try {
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: await PedidoCliente.Listar(idCliente(ctx)),
    };
  } catch (error) {
    console.error("Error listar pedidos de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const obtenerPedidoCliente = async (
  ctx: RouterContext<"/api/cliente/pedidos/:id">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de pedido inválido" };
      return;
    }
    const pedido = await PedidoCliente.Obtener(idCliente(ctx), id_pedido);
    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedido };
  } catch (error) {
    console.error("Error obtener pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const crearPedidoCliente = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const id_direccion = Number(body.id_direccion);
    const observaciones = body.observaciones === undefined ||
        body.observaciones === null
      ? undefined
      : String(body.observaciones).trim();
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
    const resultado = await PedidoCliente.CrearDesdeCarrito(
      idCliente(ctx),
      id_direccion,
      observaciones || undefined,
    );
    if (resultado.success && resultado.id_pedido) {
      await notificarClienteCambioPedido(resultado.id_pedido, "confirmado");
    }
    ctx.response.status = resultado.success ? 201 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error crear pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cancelarPedidoCliente = async (
  ctx: RouterContext<"/api/cliente/pedidos/:id/cancelar">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const motivo = body.motivo === undefined || body.motivo === null
      ? undefined
      : String(body.motivo).trim();
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      (motivo !== undefined && motivo.length > 1000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID o motivo inválido" };
      return;
    }
    const resultado = await PedidoCliente.Cancelar(
      idCliente(ctx),
      id_pedido,
      motivo || undefined,
    );
    if (resultado.success) {
      await notificarClienteCambioPedido(id_pedido, "cancelado", motivo);
    }
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error cancelar pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
