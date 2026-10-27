import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const respuesta = await llamarBackend('/api/admin/inventario', { token });
  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};