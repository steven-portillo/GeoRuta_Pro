import type { APIRoute } from 'astro';

const BACKEND_URL = import.meta.env.API_DENO || 'http://127.0.0.1:8005';
const NOMBRE_COOKIE = 'token';
const HORAS_EXPIRACION = 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const cuerpo = await request.json();

    if (!cuerpo.credential) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token de Google requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await fetch(`${BACKEND_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: cuerpo.credential }),
    });

    const texto = await respuesta.text();
    const datos = texto
      ? JSON.parse(texto)
      : { success: false, message: 'Respuesta vacía del backend' };

    if (!datos.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: datos.message ?? 'Error al iniciar sesión con Google',
        }),
        {
          status: respuesta.status || 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Tu backend devuelve accessToken + data
    const accessToken = datos.accessToken;
    const usuario = datos.data;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'No se recibió el token' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    cookies.set(NOMBRE_COOKIE, accessToken, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: HORAS_EXPIRACION * 60 * 60,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'OK', usuario }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'No fue posible iniciar sesión con Google',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};