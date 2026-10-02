import { Context } from "../../Dependencies/dependencias.ts";
import { Perfil } from "../../Model/Perfil/PerfilModel.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";

/** GET /api/perfil */
export const obtenerPerfil = async (ctx: Context) => {
  try {
    const usuarioToken = ctx.state.user as { sub: string };
    const id_usuario = Number(usuarioToken.sub);

    const perfil = await Perfil.Obtener(id_usuario);
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

/** PUT /api/perfil */
export const editarPerfil = async (ctx: Context) => {
  try {
    const usuarioToken = ctx.state.user as { sub: string };
    const id_usuario = Number(usuarioToken.sub);

    const form = await ctx.request.body.formData();
    const nombre = form.get("nombre")
      ? String(form.get("nombre")).trim()
      : undefined;
    const apellido = form.get("apellido")
      ? String(form.get("apellido")).trim()
      : undefined;
    const email = form.get("email")
      ? String(form.get("email")).trim()
      : undefined;
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

    const resultado = await Perfil.Editar(id_usuario, {
      nombre,
      apellido,
      email,
      imagen_url: rutaFoto,
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

/** PATCH /api/perfil/password */
export const cambiarPassword = async (ctx: Context) => {
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

    const resultado = await Perfil.CambiarPassword(id_usuario, {
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
