import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Inventario } from "../../Model/Admin/InventarioModel.ts";

/** GET /api/admin/inventario */
export const listarInventario = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const inventario = await Inventario.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: inventario };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** POST /api/admin/inventario/agregar */
export const agregarStock = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number; sub: string };
    const body = await ctx.request.body.json();

    const id_producto = Number(body.id_producto);
    const cantidad = Number(body.cantidad);
    const motivo = String(body.motivo ?? "").trim();

    if (
      !id_producto ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0 ||
      !motivo
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Faltan campos obligatorios o la cantidad no es válida",
      };
      return;
    }

    const id_usuario = Number(usuario.sub);

    const resultado = await Inventario.AgregarStock(
      usuario.id_empresa,
      id_usuario,
      {
        id_producto,
        cantidad,
        motivo,
      },
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

/** GET /api/admin/inventario/:id/historial */
export const historialInventario = async (
  ctx: RouterContext<"/api/admin/inventario/:id/historial">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_producto = Number(ctx.params.id);

    if (Number.isNaN(id_producto)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const resultado = await Inventario.HistorialMovimientos(
      id_producto,
      usuario.id_empresa,
    );
    if (!resultado) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Producto no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: resultado };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
