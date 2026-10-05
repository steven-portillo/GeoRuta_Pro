// src/pages/api/auth/proveedor/notificaciones.ts
// proxy BFF: GET /proveedor/notificaciones (ultimas 10 + cuantas no leidas)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/proveedor/notificaciones', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};