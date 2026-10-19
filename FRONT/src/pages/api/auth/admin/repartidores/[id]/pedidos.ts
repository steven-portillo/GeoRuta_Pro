// src/pages/api/auth/admin/repartidores/[id]/pedidos.ts
// proxy BFF: GET /admin/repartidores/:id/pedidos (para el modal "Ver repartidor")
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const idRepartidor = params.id;
  const token = obtenerToken(cookies);

  const respuesta = await llamarBackend(`/admin/repartidores/${idRepartidor}/pedidos`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};