// src/pages/api/auth/recuperar/restablecer.ts
import type { APIRoute } from 'astro';
import { llamarBackend } from '../../../../lib/Backend';

// proxy bff publico: manda correo + codigo + contraseña nueva al backend.
// no inicia sesion: tras el exito el usuario entra por el login normal
export const POST: APIRoute = async ({ request }) => {
  try {
    const cuerpo = await request.json();

    const { status, datos } = await llamarBackend('/auth/recuperar/restablecer', {
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
      JSON.stringify({ success: false, message: 'No fue posible cambiar la contraseña' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};