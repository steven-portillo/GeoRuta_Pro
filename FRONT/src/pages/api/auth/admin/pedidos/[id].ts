// src/pages/api/auth/admin/pedidos/[id].ts
// proxy BFF: GET /admin/pedidos/:id (detalle del pedido, para el modal)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const idPedido = params.id;
  const token = obtenerToken(cookies);

  const respuesta = await llamarBackend(`/admin/pedidos/${idPedido}`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};