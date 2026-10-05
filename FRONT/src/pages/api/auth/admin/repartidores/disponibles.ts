// src/pages/api/auth/admin/repartidores/disponibles.ts
// proxy BFF: GET /admin/repartidores/disponibles (para el selector del modal de asignar)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/admin/repartidores/disponibles', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};