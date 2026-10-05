// src/pages/api/cliente/pedidos/[id].ts
// proxy BFF: el navegador nunca llama directo al backend Deno, pasa por aca
// (mismo patron que /api/cliente/proveedores/[idEmpresa]/productos.ts)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const idPedido = params.id;
  const token = obtenerToken(cookies);

  const respuesta = await llamarBackend(`/cliente/pedidos/${idPedido}`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.datos.success ? 200 : 404,
    headers: { 'Content-Type': 'application/json' },
  });
};