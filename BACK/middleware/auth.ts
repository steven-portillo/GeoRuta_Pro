import { Context, Next } from "../dependencies/dependencias.ts";
import { verificarTokeAcceso } from "../helper/JWT.ts";
import { UsuarioModel } from "../model/usuarioModel.ts";

/** Exige JWT válido y carga el usuario en ctx.state.usuario */
export const verificarJWT = async (ctx: Context, next: Next) => {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token no proporcionado" };
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const payload = await verificarTokeAcceso(token);

  if (!payload || !payload.sub) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token inválido o expirado" };
    return;
  }

  const usuario = await UsuarioModel.buscarPorId(Number(payload.sub));

  if (!usuario || !usuario.activo) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Usuario no encontrado o inactivo" };
    return;
  }

  (ctx.state as any).usuario = usuario;
  await next();
};

/** Restringe por nombre de rol. Ejemplo: soloRol("ADMIN", "SUPERADMIN") */
export const soloRol = (...roles: string[]) => {
  return async (ctx: Context, next: Next) => {
    const usuario = (ctx.state as any).usuario;

    if (!usuario || !roles.includes(usuario.nombre_rol)) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "No tienes permiso para esta acción",
      };
      return;
    }

    await next();
  };
};