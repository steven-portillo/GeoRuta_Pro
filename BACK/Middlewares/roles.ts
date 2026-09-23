import { Context, Next } from "../Dependencies/dependencias.ts";

/** Solo Admin */
export async function soloAdmin(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "Admin") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Administrador",
    };
    return;
  }

  await next();
}

/** Solo Técnico */
export async function soloTecnico(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "Tecnico") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Técnico",
    };
    return;
  }

  await next();
}

/** Solo Usuario (Cliente) */
export async function soloUsuario(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "Usuario") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Usuario/Cliente",
    };
    return;
  }

  await next();
}

/** Admin o Técnico */
export async function adminOTecnico(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "Admin" && usuario?.rol !== "Tecnico") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Administrador o Técnico",
    };
    return;
  }

  await next();
}