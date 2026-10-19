import { defineMiddleware } from "astro:middleware";
import { jwtVerify } from "jose";

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

// Se calcula una sola vez, no en cada petición
const secreto = import.meta.env.JWT_SECRET;
if (!secreto) {
  throw new Error("JWT_SECRET no está configurada en el .env de Astro");
}
const CLAVE = new TextEncoder().encode(secreto);

// "/admin" coincide con "/admin" y "/admin/inicio", pero NO con "/administracion"
const coincide = (pathname: string, prefijo: string) =>
  pathname === prefijo || pathname.startsWith(prefijo + "/");

const respuestaJson = (status: number, message: string) =>
  new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const esApi = pathname.startsWith("/api/");

  const rutaProtegida = RUTAS_PROTEGIDAS.find((r) =>
    coincide(pathname, r.prefijo),
  );

  // Públicas: login, registro, home, /api/auth/login, etc.
  if (!rutaProtegida) {
    return next();
  }

  const token = context.cookies.get(NOMBRE_COOKIE)?.value;

  if (!token) {
    return esApi
      ? respuestaJson(401, "No autenticado")
      : context.redirect("/login");
  }

  try {
    const { payload } = await jwtVerify(token, CLAVE, {
      algorithms: ["HS256"],
    });

    const rol = String(payload.rol ?? "").toUpperCase();

    if (rol !== rutaProtegida.rol) {
      return esApi
        ? respuestaJson(403, "No tienes permisos para esta acción")
        : context.redirect("/login?error=sin_permisos");
    }

    // crearToken() en Deno guarda { id, rol, id_empresa }
    const idUsuario = Number(payload.id ?? payload.sub);
    const idEmpresa = payload.id_empresa ?? payload.idEmpresa ?? null;

    context.locals.usuario = {
      idUsuario,
      idEmpresa: idEmpresa === null ? null : Number(idEmpresa),
      rol,
    };

    return next();
  } catch (error) {
    console.error("JWT inválido o expirado:", error);
    context.cookies.delete(NOMBRE_COOKIE, { path: "/" });
    return esApi
      ? respuestaJson(401, "Sesión expirada")
      : context.redirect("/login?error=sesion_expirada");
  }
});