import { Context } from "../../Dependencies/dependencias.ts";
import {
  escribirArchivo,
  generarRutaArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";
import { EmpresaModel } from "../../Model/Admin/EmpresaPerfilModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const colorEmpresa = async (ctx: Context) => {
  const { response, state } = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion || !sesion.idEmpresa) {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const data = await EmpresaModel.tomarColorEmpresa(Number(sesion.idEmpresa));
    response.status = 200;
    response.body = data;
  } catch (error) {
    console.log("error auth empresa color: " + error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** GET /api/admin/empresa */
export const obtenerEmpresa = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as Sesion;
    const empresa = await EmpresaModel.Obtener(usuario.idEmpresa!);

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
    const usuario = ctx.state.user as Sesion;
    const form = await ctx.request.body.formData();

    const nombre = form.get("nombre")
      ? String(form.get("nombre")).trim()
      : undefined;
    const descripcionRaw = form.get("descripcion");
    const descripcion = descripcionRaw !== null
      ? String(descripcionRaw).trim()
      : undefined;
    const colorPrimario = form.get("color_primario")
      ? String(form.get("color_primario")).trim()
      : undefined;
    const logo = form.get("logo") as File | null;

    if (colorPrimario && !HEX_REGEX.test(colorPrimario)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "color_primario no es un color hexadecimal válido",
      };
      return;
    }

    let logoUrl: string | undefined = undefined;

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
      logoUrl = generarRutaArchivo(logo, "logos");
      await escribirArchivo(logo, logoUrl);
    }

    const resultado = await EmpresaModel.Editar(usuario.idEmpresa!, {
      nombre,
      descripcion,
      logo_url: logoUrl,
      color_primario: colorPrimario,
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
