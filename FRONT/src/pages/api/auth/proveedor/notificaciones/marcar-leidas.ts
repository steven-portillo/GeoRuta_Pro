// src/pages/api/auth/proveedor/notificaciones/marcar-leidas.ts
// proxy BFF: POST /proveedor/notificaciones/marcar-leidas
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/proveedor/notificaciones/marcar-leidas', {
    metodo: 'POST',
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};