import { VerificarTokenAcceso } from "../Helpers/Jwt.ts";
import { Context, Next } from "../Dependencies/dependencias.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      message: "No tiene autenticación. Token requerido.",
    };
    return;
  }

  const token = authHeader.split(" ")[1];
  const usuario = await VerificarTokenAcceso(token);

  if (!usuario) {
    ctx.response.status = 401;
    ctx.response.body = {
      success: false,
      message: "Token inválido o expirado",
    };
    return;
  }

  // Guardamos el usuario decodificado en el estado del contexto
  ctx.state.user = usuario;
  await next();
}
