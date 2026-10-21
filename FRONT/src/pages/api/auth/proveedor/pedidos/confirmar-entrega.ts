// src/pages/api/auth/proveedor/pedidos/confirmar-entrega.ts
// proxy BFF: POST /proveedor/pedidos/confirmar-entrega ({ idPedido, codigo })
//para pedidos contra entrega
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/proveedor/pedidos/confirmar-entrega', {
    metodo: 'POST',
    cuerpo,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};