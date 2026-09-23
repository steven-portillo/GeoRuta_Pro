import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Notificacion } from "../../Models/Notificacion.model.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /proveedor/notificaciones
export const obtenerNotificaciones = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjNotificacion = new Notificacion(idUsuario);
    const resultado = await ObjNotificacion.ObtenerRecientes();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las notificaciones" };
  }
};

// POST /proveedor/notificaciones/marcar-leidas
export const marcarNotificacionesLeidas = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjNotificacion = new Notificacion(idUsuario);
    const resultado = await ObjNotificacion.MarcarTodasLeidas();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible marcar las notificaciones" };
  }
};