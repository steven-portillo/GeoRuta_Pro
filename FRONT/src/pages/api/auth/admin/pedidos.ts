// src/pages/api/auth/admin/pedidos.ts
// proxy BFF: GET /admin/pedidos (lista + metricas)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/admin/pedidos', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};