import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { ResenaCliente } from "../../Model/Cliente/ResenaModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const listarResenasCliente = async (ctx: Context) => {
  try {
    const { pendientes, enviadas } = await ResenaCliente.Listar(
      idCliente(ctx),
    );
    ctx.response.status = 200;
    ctx.response.body = { success: true, pendientes, enviadas };
  } catch (error) {
    console.error("Error listar reseñas de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar las reseñas",
    };
  }
};

export const crearResenaCliente = async (
  ctx: RouterContext<"/api/cliente/pedidos/:id/resenas">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const id_producto = Number(body.id_producto);
    const calificacion = Number(body.calificacion);
    const comentario = body.comentario === undefined || body.comentario === null
      ? undefined
      : String(body.comentario).trim();
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      !Number.isSafeInteger(id_producto) || id_producto <= 0 ||
      !Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5 ||
      (comentario !== undefined && comentario.length > 2000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Datos de reseña inválidos",
      };
      return;
    }
    const resultado = await ResenaCliente.Crear(
      idCliente(ctx),
      id_pedido,
      id_producto,
      calificacion,
      comentario || undefined,
    );
    ctx.response.status = resultado.success ? 201 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error crear reseña de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const editarResenaCliente = async (
  ctx: RouterContext<"/api/cliente/resenas/:id">,
) => {
  try {
    const id_resena = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const calificacion = body.calificacion === undefined
      ? undefined
      : Number(body.calificacion);
    const comentario = body.comentario === undefined
      ? undefined
      : body.comentario === null
      ? null
      : String(body.comentario).trim();
    if (
      !Number.isSafeInteger(id_resena) || id_resena <= 0 ||
      (calificacion !== undefined &&
        (!Number.isInteger(calificacion) || calificacion < 1 ||
          calificacion > 5)) ||
      (comentario !== undefined && comentario !== null &&
        comentario.length > 2000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Datos de reseña inválidos",
      };
      return;
    }
    const resultado = await ResenaCliente.Editar(
      idCliente(ctx),
      id_resena,
      { calificacion, comentario },
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error editar reseña de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const desactivarResenaCliente = async (
  ctx: RouterContext<"/api/cliente/resenas/:id">,
) => {
  try {
    const id_resena = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_resena) || id_resena <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de reseña inválido" };
      return;
    }
    const desactivada = await ResenaCliente.Desactivar(
      idCliente(ctx),
      id_resena,
    );
    ctx.response.status = desactivada ? 200 : 404;
    ctx.response.body = desactivada
      ? { success: true, message: "Reseña desactivada correctamente" }
      : { success: false, message: "Reseña no encontrada o ya desactivada" };
  } catch (error) {
    console.error("Error desactivar reseña de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
