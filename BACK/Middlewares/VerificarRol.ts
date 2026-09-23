import { Context, Next } from "../Dependencies/Dependencias.ts";

// uso: router.get("/admin/inicio", VerificarAutenticacion, VerificarRol("ADMIN"), handler)
export function VerificarRol(...rolesPermitidos: string[]) {
  return async (ctx: Context, next: Next) => {
    const usuario = ctx.state.usuario as { rol?: string } | undefined;

    if (!usuario?.rol || !rolesPermitidos.includes(usuario.rol)) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "No tienes permisos para esta acción" };
      return;
    }
    await next();
  };
}