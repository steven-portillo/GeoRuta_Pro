// src/pages/api/auth/registro-empresa.ts
import type { APIRoute } from 'astro';

export const prerender = false;

const API_DENO = import.meta.env.API_DENO;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const respuesta = await fetch(`${API_DENO}/api/auth/register-empresa`, {
      method: 'POST',
      body: formData,
    });

    const resultado = await respuesta.json();

    return new Response(JSON.stringify(resultado), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en registro-empresa:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'No fue posible conectar con el servidor',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};