import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Usuario } from "../../Models/Usuario.model.ts";
import { Empresa } from "../../Models/Empresa.model.ts";
import { EsquemaActualizarPerfilAdmin } from "../../Helpers/EsquemasValidacion.ts";
import { guardarFotoPerfil, guardarLogoEmpresaAdmin } from "../../Helpers/GestorArchivos.ts";

// extrae idUsuario/idEmpresa del payload que VerificarAutenticacion dejo en ctx.state.usuario
function obtenerUsuarioAutenticado(ctx: RouterContext<string>) {
  const usuario = ctx.state.usuario as { sub: string; idEmpresa: number | null } | undefined;
  return {
    idUsuario: usuario ? Number(usuario.sub) : null,
    idEmpresa: usuario?.idEmpresa ?? null,
  };
}

// GET /admin/perfil
export const obtenerPerfil = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjUsuario = new Usuario(idUsuario);
    const resultado = await ObjUsuario.ObtenerPerfil();

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener el perfil" };
  }
};

// POST /admin/perfil
export const actualizarPerfil = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaActualizarPerfilAdmin.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjUsuario = new Usuario(idUsuario, null, null, resultado.data);
    const resultadoActualizacion = await ObjUsuario.ActualizarPerfil();

    response.status = resultadoActualizacion.success ? 200 : 409;
    response.body = resultadoActualizacion;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el perfil" };
  }
};

// POST /admin/perfil/foto (form-data, campo "foto")
export const subirFotoPerfil = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    if (!idUsuario) {
      response.status = 401;
      response.body = { success: false, message: "Sin permisos" };
      return;
    }

    const cuerpoFormData = await request.body.formData();
    const foto = cuerpoFormData.get("foto");

    if (!(foto instanceof File) || foto.size === 0) {
      response.status = 400;
      response.body = { success: false, message: "No se recibió ninguna imagen" };
      return;
    }

    const imagenUrl = await guardarFotoPerfil(foto, idUsuario);
    const ObjUsuario = new Usuario(idUsuario);
    await ObjUsuario.ActualizarImagenPerfil(imagenUrl);

    response.status = 200;
    response.body = { success: true, message: "Foto actualizada", imagenUrl };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible subir la imagen",
    };
  }
};

// POST /admin/perfil/logo-empresa (form-data, campo "logo")
export const subirLogoEmpresaAdmin = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const { idUsuario, idEmpresa } = obtenerUsuarioAutenticado(ctx);
    if (!idUsuario || !idEmpresa) {
      response.status = 401;
      response.body = { success: false, message: "Sin permisos" };
      return;
    }

    const cuerpoFormData = await request.body.formData();
    const logo = cuerpoFormData.get("logo");

    if (!(logo instanceof File) || logo.size === 0) {
      response.status = 400;
      response.body = { success: false, message: "No se recibió ninguna imagen" };
      return;
    }

    const logoUrl = await guardarLogoEmpresaAdmin(logo, idUsuario);
    const ObjEmpresa = new Empresa(idEmpresa);
    await ObjEmpresa.ActualizarLogo(logoUrl);

    response.status = 200;
    response.body = { success: true, message: "Logo actualizado", logoUrl };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible subir el logo",
    };
  }
};