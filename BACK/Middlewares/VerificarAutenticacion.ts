import { Context, Next, verificarFirmaJWT } from "../Dependencies/Dependencias.ts";
import { obtenerClaveJWT } from "../Helpers/GenerarToken.ts";

export async function VerificarAutenticacion(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token no proporcionado" };
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const clave = await obtenerClaveJWT();
    const payload = await verificarFirmaJWT(token, clave);
    ctx.state.usuario = payload;
    await next();
  } catch (_error) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "Token inválido o expirado" };
  }
}