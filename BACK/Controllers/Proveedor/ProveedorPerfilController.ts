import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Usuario } from "../../Models/Usuario.model.ts";
import { EsquemaActualizarPerfilProveedor } from "../../Helpers/EsquemasValidacion.ts";
import { guardarFotoPerfil } from "../../Helpers/GestorArchivos.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /proveedor/perfil
export const obtenerPerfil = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjUsuario = new Usuario(idUsuario);
    const resultado = await ObjUsuario.ObtenerPerfilProveedor();

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener el perfil" };
  }
};

// POST /proveedor/perfil
export const actualizarPerfil = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaActualizarPerfilProveedor.safeParse(cuerpo);

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
    const ObjUsuario = new Usuario(idUsuario, null, null, null, resultado.data);
    const resultadoActualizacion = await ObjUsuario.ActualizarPerfilProveedor();

    response.status = resultadoActualizacion.success ? 200 : 409;
    response.body = resultadoActualizacion;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el perfil" };
  }
};

// POST /proveedor/perfil/foto (form-data, campo "foto")
export const subirFoto = async (ctx: RouterContext<string>) => {
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