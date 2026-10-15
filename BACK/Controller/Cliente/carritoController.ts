import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { CarritoCliente } from "../../Model/Cliente/CarritoModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const obtenerCarritoCliente = async (ctx: Context) => {
  try {
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: await CarritoCliente.Obtener(idCliente(ctx)),
    };
  } catch (error) {
    console.error("Error obtener carrito de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const establecerCantidadCarrito = async (
  ctx: RouterContext<"/api/cliente/carrito/items/:id_producto">,
) => {
  try {
    const id_producto = Number(ctx.params.id_producto);
    const body = await ctx.request.body.json();
    const cantidad = body.cantidad;
    if (
      !Number.isSafeInteger(id_producto) || id_producto <= 0 ||
      !Number.isSafeInteger(cantidad) || cantidad < 0 ||
      cantidad > 2147483647
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "El ID y la cantidad deben ser números enteros válidos",
      };
      return;
    }
    const resultado = await CarritoCliente.EstablecerCantidad(
      idCliente(ctx),
      id_producto,
      cantidad,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error actualizar carrito de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const eliminarItemCarrito = async (
  ctx: RouterContext<"/api/cliente/carrito/items/:id_producto">,
) => {
  try {
    const id_producto = Number(ctx.params.id_producto);
    if (!Number.isSafeInteger(id_producto) || id_producto <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de producto inválido",
      };
      return;
    }
    const eliminado = await CarritoCliente.EliminarItem(
      idCliente(ctx),
      id_producto,
    );
    ctx.response.status = eliminado ? 200 : 404;
    ctx.response.body = eliminado
      ? { success: true, message: "Producto eliminado del carrito" }
      : { success: false, message: "Producto no encontrado en el carrito" };
  } catch (error) {
    console.error("Error eliminar producto del carrito:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
