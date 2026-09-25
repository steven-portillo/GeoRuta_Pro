import { Context, Next } from "../Dependencies/dependencias.ts";

/** Solo SUPERADMIN */
export async function soloSuperAdmin(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "SUPERADMIN") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Super Administrador",
    };
    return;
  }

  await next();
}

/** Solo ADMIN */
export async function soloAdmin(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "ADMIN") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Administrador",
    };
    return;
  }

  await next();
}

/** Solo Cliente*/
export async function soloCliente(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "CLIENTE") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de Cliente",
    };
    return;
  }

  await next();
}

/**  Solo PROVEEDOR */
export async function soloProveedor(ctx: Context, next: Next) {
  const usuario = ctx.state.user as { rol?: string } | undefined;

  if (usuario?.rol !== "PROVEEDOR") {
    ctx.response.status = 403;
    ctx.response.body = {
      success: false,
      message: "Esta acción requiere rol de PROVEEDOR",
    };
    return;
  }

  await next();
}