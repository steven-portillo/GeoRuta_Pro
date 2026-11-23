// src/pages/api/auth/proveedor/pedidos/iniciar-entregas.ts
// proxy BFF: POST /proveedor/pedidos/iniciar-entregas (no recibe cuerpo)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);

  const respuesta = await llamarBackend('/proveedor/pedidos/iniciar-entregas', {
    metodo: 'POST',
    cuerpo: {},
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};