import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Proveedor } from "../../Model/Admin/ProveedorModel.ts";

/** GET /api/admin/proveedores */
export const listarProveedores = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const proveedores = await Proveedor.Listar(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: proveedores };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** GET /api/admin/proveedores/:id */
export const obtenerProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const proveedor = await Proveedor.ObtenerPorId(
      id_usuario,
      usuario.id_empresa,
    );
    if (!proveedor) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Proveedor no encontrado",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: proveedor };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** POST /api/admin/proveedores */
export const crearProveedor = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const body = await ctx.request.body.json();

    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!nombre || !apellido || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Faltan campos obligatorios",
      };
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    if (password.length < 8) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const resultado = await Proveedor.Crear(usuario.id_empresa, {
      nombre,
      apellido,
      email,
      password,
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

/** PUT /api/admin/proveedores/:id */
export const editarProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const nombre = body.nombre ? String(body.nombre).trim() : undefined;
    const apellido = body.apellido ? String(body.apellido).trim() : undefined;
    const email = body.email ? String(body.email).trim() : undefined;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    const resultado = await Proveedor.Editar(id_usuario, usuario.id_empresa, {
      nombre,
      apellido,
      email,
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

/** PATCH /api/admin/proveedores/:id/estado */
export const cambiarEstadoProveedor = async (
  ctx: RouterContext<"/api/admin/proveedores/:id/estado">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_usuario = Number(ctx.params.id);

    if (Number.isNaN(id_usuario)) {
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

    const resultado = await Proveedor.CambiarEstado(
      id_usuario,
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
