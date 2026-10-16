// src/pages/api/auth/recuperar/solicitar.ts
import type { APIRoute } from 'astro';
import { llamarBackend } from '../../../../lib/Backend';

// proxy bff publico: pide al backend que envie el codigo de recuperacion al correo.
// el backend responde siempre lo mismo exista o no el correo, aqui solo se reenvia
export const POST: APIRoute = async ({ request }) => {
  try {
    const cuerpo = await request.json();

    const { status, datos } = await llamarBackend('/auth/recuperar/solicitar', {
      metodo: 'POST',
      cuerpo,
    });

    return new Response(JSON.stringify(datos), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible enviar el código' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};