// src/pages/api/auth/admin/repartidores/asignar.ts
// proxy BFF: POST /admin/repartidores/asignar
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/admin/repartidores/asignar', { metodo: 'POST', cuerpo, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};