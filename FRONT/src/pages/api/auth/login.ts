// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import { llamarBackend, NOMBRE_COOKIE } from '../../../lib/Backend';

interface UsuarioLogin {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  imagenUrl: string | null;
}

interface DatosLogin {
  token: string;
  usuario: UsuarioLogin;
}

// horas de vigencia del jwt — debe coincidir con JWT_EXPIRACION_HORAS del backend
// (8 horas por defecto en GenerarToken.ts) para que la cookie no dure mas que el token
const HORAS_EXPIRACION_COOKIE = 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const cuerpo = await request.json();

    // ojo: la ruta real en el backend deno es "/auth/login" (Auth_routes.ts),
    // no "/login" — con "/login" el backend responde 404 y el login nunca funciona
    const { status, datos } = await llamarBackend<DatosLogin>('/auth/login', {
      metodo: 'POST',
      cuerpo,
    });

    if (!datos.success || !datos.data) {
      // reenvia tal cual el status y el mensaje que dio el backend
      // (ej. 401 email/password incorrectos)
      return new Response(JSON.stringify({ success: false, message: datos.message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, usuario } = datos.data;

    // guarda el jwt en una cookie httponly: el navegador la manda automaticamente
    // en cada request a este mismo dominio (astro), pero ningun script del lado
    // del cliente puede leerla, ni siquiera con document.cookie
    cookies.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: HORAS_EXPIRACION_COOKIE * 60 * 60,
    });

    // al cliente solo le devolvemos los datos del usuario (sin el token) para
    // que el frontend decida a que dashboard redirigir segun el rol
    return new Response(
      JSON.stringify({ success: true, message: datos.message, usuario }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible iniciar sesion' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};