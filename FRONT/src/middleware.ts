// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { jwtVerify } from "jose";

declare global {
  namespace App {
    interface Locals {
      usuario: {
        idUsuario: number;
        idEmpresa: number | null;
        rol: string;
      };
    }
  }
}

/** Misma cookie que setea pages/api/auth/login.ts */
const NOMBRE_COOKIE = "token";

const RUTAS_PROTEGIDAS: { prefijo: string; rol: string }[] = [
  { prefijo: "/cliente", rol: "CLIENTE" },
  { prefijo: "/api/auth/cliente", rol: "CLIENTE" },
  { prefijo: "/admin", rol: "ADMIN" },
  { prefijo: "/api/auth/admin", rol: "ADMIN" },
  { prefijo: "/proveedor", rol: "PROVEEDOR" },
  { prefijo: "/api/auth/proveedor", rol: "PROVEEDOR" },
  { prefijo: "/superadmin", rol: "SUPERADMIN" },
  { prefijo: "/api/auth/superadmin", rol: "SUPERADMIN" },
];

async function obtenerClaveSecreta(): Promise<Uint8Array> {
  const secreto = import.meta.env.JWT_SECRET;
  if (!secreto) {
    throw new Error("JWT_SECRET no está configurada en el .env de Astro");
  }
  return new TextEncoder().encode(secreto);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const rutaProtegida = RUTAS_PROTEGIDAS.find((r) =>
    pathname.startsWith(r.prefijo),
  );

  // Públicas: login, registro, home, /api/auth/login, etc.
  if (!rutaProtegida) {
    return next();
  }

  const token = context.cookies.get(NOMBRE_COOKIE)?.value;

  if (!token) {
    return context.redirect("/login");
  }

  try {
    const clave = await obtenerClaveSecreta();
    const { payload } = await jwtVerify(token, clave);

    const rol = String(payload.rol ?? "").toUpperCase();

    if (rol !== rutaProtegida.rol) {
      return context.redirect("/login?error=sin_permisos");
    }

    context.locals.usuario = {
      idUsuario: Number(payload.sub),
      idEmpresa: (payload.idEmpresa as number | null) ?? null,
      rol,
    };

    return next();
  } catch (error) {
    console.error("JWT inválido o expirado:", error);
    context.cookies.delete(NOMBRE_COOKIE, { path: "/" });
    return context.redirect("/login?error=sesion_expirada");
  }
});