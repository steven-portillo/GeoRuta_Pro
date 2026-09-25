import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Producto } from "../../Model/Admin/ProductoModel.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";

/** GET /api/admin/productos */
export const listarProductos = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const productos = await Producto.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: productos };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** GET /api/admin/productos/:id */
export const obtenerProducto = async (
  ctx: RouterContext<"/api/admin/productos/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_producto = Number(ctx.params.id);

    if (Number.isNaN(id_producto)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const producto = await Producto.ObtenerPorId(
      id_producto,
      usuario.id_empresa,
    );
    if (!producto) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Producto no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: producto };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** POST /api/admin/productos */
export const crearProducto = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const form = await ctx.request.body.formData();

    const id_categoria = Number(form.get("id_categoria"));
    const nombre = String(form.get("nombre") ?? "").trim();
    const descripcionRaw = form.get("descripcion");
    const descripcion = descripcionRaw
      ? String(descripcionRaw).trim()
      : undefined;
    const precio = Number(form.get("precio"));
    const stockMinimoRaw = form.get("stock_minimo");
    const stock_minimo = stockMinimoRaw ? Number(stockMinimoRaw) : undefined;
    const imagenes = form.getAll("imagenes");

    if (!nombre || !id_categoria || Number.isNaN(precio)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Faltan campos obligatorios",
      };
      return;
    }

    const archivosValidados: File[] = [];
    for (const imagen of imagenes) {
      if (!(imagen instanceof File)) continue;

      const error = validarArchivo(imagen);
      if (error) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: error };
        return;
      }
      archivosValidados.push(imagen);
    }

    const rutasImagenes = archivosValidados.map((archivo) =>
      generarRutaArchivo(archivo, "productos"),
    );

    const resultado = await Producto.Crear(
      usuario.id_empresa,
      { id_categoria, nombre, descripcion, precio, stock_minimo },
      rutasImagenes,
    );

    if (!resultado.success) {
      ctx.response.status = 400;
      ctx.response.body = resultado;
      return;
    }

    for (let i = 0; i < archivosValidados.length; i++) {
      await escribirArchivo(archivosValidados[i], rutasImagenes[i]);
    }

    ctx.response.status = 201;
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

/** PUT /api/admin/productos/:id */
export const editarProducto = async (
  ctx: RouterContext<"/api/admin/productos/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_producto = Number(ctx.params.id);

    if (Number.isNaN(id_producto)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const form = await ctx.request.body.formData();

    const id_categoria = form.get("id_categoria")
      ? Number(form.get("id_categoria"))
      : undefined;
    const nombreRaw = form.get("nombre");
    const nombre = nombreRaw ? String(nombreRaw).trim() : undefined;
    const descripcionRaw = form.get("descripcion");
    const descripcion =
      descripcionRaw !== null ? String(descripcionRaw).trim() : undefined;
    const precio = form.get("precio") ? Number(form.get("precio")) : undefined;
    const stock_minimo = form.get("stock_minimo")
      ? Number(form.get("stock_minimo"))
      : undefined;
    const imagenes = form.getAll("imagenes");

    const archivosValidados: File[] = [];
    for (const imagen of imagenes) {
      if (!(imagen instanceof File)) continue;

      const error = validarArchivo(imagen);
      if (error) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: error };
        return;
      }
      archivosValidados.push(imagen);
    }

    const rutasImagenes = archivosValidados.map((archivo) =>
      generarRutaArchivo(archivo, "productos"),
    );

    const resultado = await Producto.Editar(
      id_producto,
      usuario.id_empresa,
      { id_categoria, nombre, descripcion, precio, stock_minimo },
      rutasImagenes,
    );

    if (!resultado.success) {
      ctx.response.status = 404;
      ctx.response.body = resultado;
      return;
    }

    for (let i = 0; i < archivosValidados.length; i++) {
      await escribirArchivo(archivosValidados[i], rutasImagenes[i]);
    }

    ctx.response.status = 200;
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

/** PATCH /api/admin/productos/:id/estado */
export const cambiarEstadoProducto = async (
  ctx: RouterContext<"/api/admin/productos/:id/estado">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_producto = Number(ctx.params.id);

    if (Number.isNaN(id_producto)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await Producto.CambiarEstado(
      id_producto,
      usuario.id_empresa,
      body.estado,
    );
    ctx.response.status = resultado.success ? 200 : 404;
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
