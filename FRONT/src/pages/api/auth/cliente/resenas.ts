// src/pages/api/cliente/resenas.ts
// proxy BFF: POST /cliente/resenas (guardar una reseña nueva)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/cliente/resenas', { metodo: 'POST', cuerpo, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};