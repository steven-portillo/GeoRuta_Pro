// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { jwtVerify } from 'jose';
import { NOMBRE_COOKIE } from './lib/Backend';

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

// mapea el prefijo de la ruta con el rol que debe tener el jwt para entrar.
// admin/proveedor/superadmin quedan listos para cuando migremos esas vistas
// src/middleware.ts — actualizar RUTAS_PROTEGIDAS para que tambien cubra las rutas api proxy
const RUTAS_PROTEGIDAS: { prefijo: string; rol: string }[] = [
  { prefijo: '/cliente', rol: 'CLIENTE' },
  { prefijo: '/api/cliente', rol: 'CLIENTE' },
  { prefijo: '/admin', rol: 'ADMIN' },
  { prefijo: '/api/admin', rol: 'ADMIN' },
  { prefijo: '/proveedor', rol: 'PROVEEDOR' },
  { prefijo: '/api/proveedor', rol: 'PROVEEDOR' },
  { prefijo: '/superadmin', rol: 'SUPERADMIN' },
  { prefijo: '/api/superadmin', rol: 'SUPERADMIN' },
];

async function obtenerClaveSecreta(): Promise<Uint8Array> {
  const secreto = import.meta.env.JWT_SECRET;
  if (!secreto) throw new Error('JWT_SECRET no esta configurada en el .env de astro');
  return new TextEncoder().encode(secreto);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const rutaProtegida = RUTAS_PROTEGIDAS.find((r) => pathname.startsWith(r.prefijo));

  // rutas publicas (login, registro, home, assets, api de auth, etc.) pasan derecho
  if (!rutaProtegida) {
    return next();
  }

  const token = context.cookies.get(NOMBRE_COOKIE)?.value;

  if (!token) {
    return context.redirect('/login');
  }

  try {
    const clave = await obtenerClaveSecreta();
    const { payload } = await jwtVerify(token, clave);

    if (payload.rol !== rutaProtegida.rol) {
      // token valido, pero de un rol que no corresponde a esta seccion
      // (ej. un cliente tratando de entrar a /admin)
      return context.redirect('/login?error=sin_permisos');
    }

    // deja los datos del usuario disponibles para paginas y rutas api sin
    // tener que volver a leer/verificar la cookie en cada una
    context.locals.usuario = {
      idUsuario: Number(payload.sub),
      idEmpresa: (payload.idEmpresa as number | null) ?? null,
      rol: payload.rol as string,
    };

    return next();
  } catch (error) {
    // firma invalida o token expirado: borra la cookie muerta y manda a login
    console.error(error);
    context.cookies.delete(NOMBRE_COOKIE, { path: '/' });
    return context.redirect('/login?error=sesion_expirada');
  }
});