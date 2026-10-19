// src/pages/api/auth/proveedor/pedidos/cambiar-estado.ts
// proxy BFF: POST /proveedor/pedidos/cambiar-estado ({ idPedido, nuevoEstado })
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/proveedor/pedidos/cambiar-estado', {
    metodo: 'POST',
    cuerpo,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};