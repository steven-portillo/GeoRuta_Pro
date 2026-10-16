// src/pages/api/auth/google.ts
import type { APIRoute } from 'astro';
import { llamarBackend, NOMBRE_COOKIE } from '../../../lib/Backend';

interface UsuarioLogin {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  imagenUrl: string | null;
}

interface DatosLoginGoogle {
  token: string;
  nuevo: boolean;
  usuario: UsuarioLogin;
}

// horas de vigencia del jwt — debe coincidir con JWT_EXPIRACION_HORAS del backend
// (mismo valor que usa login.ts para que la cookie no dure mas que el token)
const HORAS_EXPIRACION_COOKIE = 8;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const cuerpo = await request.json();

    // el backend verifica la firma del token de google y crea la cuenta si no existe
    const { status, datos } = await llamarBackend<DatosLoginGoogle>('/auth/google', {
      metodo: 'POST',
      cuerpo,
    });

    if (!datos.success || !datos.data) {
      return new Response(JSON.stringify({ success: false, message: datos.message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, usuario, nuevo } = datos.data;

    // misma cookie httponly que el login normal: el token nunca llega al javascript del navegador
    cookies.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: HORAS_EXPIRACION_COOKIE * 60 * 60,
    });

    return new Response(
      JSON.stringify({ success: true, message: datos.message, usuario, nuevo }),
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