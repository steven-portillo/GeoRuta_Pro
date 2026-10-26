import type { APIRoute } from 'astro';

export const prerender = false;

const API_DENO = (
  import.meta.env.API_DENO ||
  import.meta.env.PUBLIC_API_DENO ||
  'http://127.0.0.1:8005'
).replace(/\/+$/, '');

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const response = await fetch(`${API_DENO}/api/auth/password-recovery/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body?.email,
        codigo: body?.codigo,
        nuevaContrasena: body?.nuevaContrasena,
      }),
    });
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible conectar con el servidor' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
