import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Categoria } from "../../Model/Admin/CategoriaModel.ts";

/** GET /api/admin/categorias */
export const listarCategorias = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const categorias = await Categoria.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: categorias };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** POST /api/admin/categorias */
export const crearCategoria = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const body = await ctx.request.body.json();

    const nombre = String(body.nombre ?? "").trim();
    const descripcion = body.descripcion
      ? String(body.descripcion).trim()
      : undefined;

    if (!nombre) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "El nombre es obligatorio",
      };
      return;
    }

    const resultado = await Categoria.Crear(usuario.id_empresa, {
      nombre,
      descripcion,
    });
    ctx.response.status = resultado.success ? 201 : 400;
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

/** PUT /api/admin/categorias/:id */
export const editarCategoria = async (
  ctx: RouterContext<"/api/admin/categorias/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_categoria = Number(ctx.params.id);

    if (Number.isNaN(id_categoria)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const nombre = body.nombre ? String(body.nombre).trim() : undefined;
    const descripcion =
      body.descripcion !== undefined
        ? String(body.descripcion).trim()
        : undefined;

    const resultado = await Categoria.Editar(id_categoria, usuario.id_empresa, {
      nombre,
      descripcion,
    });
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

/** PATCH /api/admin/categorias/:id/estado */
export const cambiarEstadoCategoria = async (
  ctx: RouterContext<"/api/admin/categorias/:id/estado">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_categoria = Number(ctx.params.id);

    if (Number.isNaN(id_categoria)) {
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

    const resultado = await Categoria.CambiarEstado(
      id_categoria,
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

/** GET /api/admin/categorias/:id */
export const obtenerCategoria = async (
  ctx: RouterContext<"/api/admin/categorias/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_categoria = Number(ctx.params.id);

    if (Number.isNaN(id_categoria)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const categoria = await Categoria.ObtenerPorId(
      id_categoria,
      usuario.id_empresa,
    );
    if (!categoria) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Categoría no encontrada",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: categoria };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
