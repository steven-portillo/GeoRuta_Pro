// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';

export const prerender = false;

const API_DENO = (
  import.meta.env.API_DENO ||
  import.meta.env.PUBLIC_API_DENO ||
  'http://127.0.0.1:8005'
).replace(/\/+$/, '');

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json(
        { success: false, message: 'Email y contraseña son obligatorios' },
        400,
      );
    }

    const respuesta = await fetch(`${API_DENO}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.success) {
      return json(
        { success: false, message: resultado.message ?? 'Email o contraseña incorrectos' },
        respuesta.status,
      );
    }

    cookies.set('token', resultado.accessToken, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return json(
      {
        success: true,
        usuario: {
          id: resultado.data.id,
          nombreCompleto: resultado.data.nombreCompleto,
          email: resultado.data.email,
          rol: String(resultado.data.rol).toUpperCase(),
          idRol: resultado.data.idRol,
          idEmpresa: resultado.data.idEmpresa,
        },
      },
      200,
    );
  } catch (error) {
    console.error('Error en login:', error);
    return json(
      { success: false, message: 'No fue posible conectar con el servidor' },
      500,
    );
  }
};