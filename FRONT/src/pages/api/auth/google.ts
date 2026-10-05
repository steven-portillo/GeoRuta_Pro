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

const HORAS_EXPIRACION_COOKIE = 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const cuerpo = await request.json(); // { credential: "..." }

    // Llama al backend de Deno (ajusta la ruta según cómo la tengas)
    const { status, datos } = await llamarBackend<DatosLogin>('/auth/google', {
      metodo: 'POST',
      cuerpo,
    });

    if (!datos.success || !datos.data) {
      return new Response(JSON.stringify({ success: false, message: datos.message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, usuario } = datos.data;

    cookies.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: HORAS_EXPIRACION_COOKIE * 60 * 60,
    });

    return new Response(
      JSON.stringify({ success: true, message: datos.message, usuario }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible iniciar sesión con Google' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};