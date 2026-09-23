import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { SuperAdmin } from "../../Model/Admin/SuperAdminModel.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";

/** GET /api/admin/superadmin/empresas */
export const listarEmpresas = async (ctx: Context) => {
  try {
    const empresas = await SuperAdmin.ListarEmpresas();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: empresas };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/superadmin/empresas/:id/estado */
export const cambiarEstadoEmpresa = async (
  ctx: RouterContext<"/api/admin/superadmin/empresas/:id/estado">,
) => {
  try {
    const id_empresa = Number(ctx.params.id);
    const body = await ctx.request.body.json();

    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await SuperAdmin.CambiarEstadoEmpresa(
      id_empresa,
      body.estado,
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

/** GET /api/admin/superadmin/clientes */
export const listarClientes = async (ctx: Context) => {
  try {
    const clientes = await SuperAdmin.ListarClientes();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: clientes };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/superadmin/clientes/:id/estado */
export const cambiarEstadoCliente = async (
  ctx: RouterContext<"/api/admin/superadmin/clientes/:id/estado">,
) => {
  try {
    const id_usuario = Number(ctx.params.id);
    const body = await ctx.request.body.json();

    if (![0, 1].includes(body.estado)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await SuperAdmin.CambiarEstadoCliente(
      id_usuario,
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

/** PUT /api/admin/superadmin/clientes/:id */
export const editarCliente = async (
  ctx: RouterContext<"/api/admin/superadmin/clientes/:id">,
) => {
  try {
    const id_usuario = Number(ctx.params.id);
    const form = await ctx.request.body.formData();

    const nombre = String(form.get("nombre") ?? "").trim();
    const apellido = String(form.get("apellido") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const foto = form.get("foto");

    let rutaFoto: string | undefined;

    if (foto !== null) {
      if (!(foto instanceof File)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "La foto enviada no es un archivo válido",
        };
        return;
      }

      const errorFoto = validarArchivo(foto);
      if (errorFoto) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: errorFoto };
        return;
      }

      rutaFoto = generarRutaArchivo(foto, "usuarios");
      await escribirArchivo(foto, rutaFoto);
    }

    const resultado = await SuperAdmin.EditarCliente(id_usuario, {
      nombre: nombre || undefined,
      apellido: apellido || undefined,
      email: email || undefined,
      imagen_url: rutaFoto,
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

/** GET /api/admin/superadmin/perfil */
export const obtenerPerfil = async (ctx: Context) => {
  try {
    const usuarioToken = ctx.state.user as { sub: string };
    const id_usuario = Number(usuarioToken.sub);

    const perfil = await SuperAdmin.ObtenerPerfil(id_usuario);
    if (!perfil) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Usuario no encontrado" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: perfil };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PUT /api/admin/superadmin/perfil */
export const editarPerfil = async (ctx: Context) => {
  try {
    const usuarioToken = ctx.state.user as { sub: string };
    const id_usuario = Number(usuarioToken.sub);

    const form = await ctx.request.body.formData();
    const nombre = String(form.get("nombre") ?? "").trim();
    const apellido = String(form.get("apellido") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const foto = form.get("foto");

    let rutaFoto: string | undefined;

    if (foto !== null) {
      if (!(foto instanceof File)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "La foto enviada no es un archivo válido",
        };
        return;
      }

      const errorFoto = validarArchivo(foto);
      if (errorFoto) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: errorFoto };
        return;
      }

      rutaFoto = generarRutaArchivo(foto, "usuarios");
      await escribirArchivo(foto, rutaFoto);
    }

    const resultado = await SuperAdmin.EditarPerfil(id_usuario, {
      nombre: nombre || undefined,
      apellido: apellido || undefined,
      email: email || undefined,
      imagen_url: rutaFoto,
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

/** PATCH /api/admin/superadmin/perfil/password */
export const cambiarPasswordPerfil = async (ctx: Context) => {
  try {
    const usuarioToken = ctx.state.user as { sub: string };
    const id_usuario = Number(usuarioToken.sub);

    const body = await ctx.request.body.json();
    const { passwordActual, passwordNueva } = body;

    if (!passwordActual || !passwordNueva) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Faltan campos obligatorios",
      };
      return;
    }

    if (String(passwordNueva).length < 8) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "La nueva contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    const resultado = await SuperAdmin.CambiarPassword(id_usuario, {
      passwordActual,
      passwordNueva,
    });
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
