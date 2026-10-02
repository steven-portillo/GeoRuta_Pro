import { Context } from "../../Dependencies/dependencias.ts";
import { EmpresaPerfil } from "../../Model/Admin/EmpresaPerfilModel.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** GET /api/admin/empresa */
export const obtenerEmpresa = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const empresa = await EmpresaPerfil.Obtener(usuario.id_empresa);

    if (!empresa) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Empresa no encontrada" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { success: true, data: empresa };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PUT /api/admin/empresa */
export const editarEmpresa = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const form = await ctx.request.body.formData();

    const nombre = form.get("nombre")
      ? String(form.get("nombre")).trim()
      : undefined;
    const descripcionRaw = form.get("descripcion");
    const descripcion =
      descripcionRaw !== null ? String(descripcionRaw).trim() : undefined;
    const colorPrimario = form.get("color_primario")
      ? String(form.get("color_primario")).trim()
      : undefined;
    const colorAcento = form.get("color_acento")
      ? String(form.get("color_acento")).trim()
      : undefined;
    const logo = form.get("logo");

    if (colorPrimario && !HEX_REGEX.test(colorPrimario)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "color_primario no es un color hexadecimal válido",
      };
      return;
    }
    if (colorAcento && !HEX_REGEX.test(colorAcento)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "color_acento no es un color hexadecimal válido",
      };
      return;
    }

    let rutaLogo: string | undefined;

    if (logo !== null) {
      if (!(logo instanceof File)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "El logo enviado no es un archivo válido",
        };
        return;
      }
      const errorLogo = validarArchivo(logo);
      if (errorLogo) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: errorLogo };
        return;
      }
      rutaLogo = generarRutaArchivo(logo, "logos");
      await escribirArchivo(logo, rutaLogo);
    }

    const resultado = await EmpresaPerfil.Editar(usuario.id_empresa, {
      nombre,
      descripcion,
      logo_url: rutaLogo,
      color_primario: colorPrimario,
      color_acento: colorAcento,
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
