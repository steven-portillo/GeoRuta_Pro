import { Context, Next } from "../dependencies/dependencias.ts";
import { verificarTokeAcceso } from "../helper/JWT.ts";
import { UsuarioModel } from "../model/usuarioModel.ts";

export async function authMiddlewares(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No tienes autorización" };
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = await verificarTokeAcceso(token);

  if (!payload || !payload.sub) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token inválido o expirado" };
    return;
  }

  // Cargar el usuario real desde la BD
  const usuario = await UsuarioModel.buscarPorId(Number(payload.sub));

  if (!usuario || !usuario.activo) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Usuario no encontrado o inactivo" };
    return;
  }

  // Guardamos el usuario completo en el contexto
  (ctx.state as any).usuario = usuario;

  await next();
}