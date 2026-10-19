// src/pages/api/auth/proveedor/pedidos.ts
// proxy BFF: GET /proveedor/pedidos (pedidos asignados al repartidor autenticado)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/proveedor/pedidos', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};