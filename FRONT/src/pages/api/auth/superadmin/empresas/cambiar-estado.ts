// src/pages/api/auth/superadmin/empresas/cambiar-estado.ts
// proxy BFF para activar/desactivar una empresa (POST /superadmin/empresas/cambiar-estado)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/superadmin/empresas/cambiar-estado', {
    metodo: 'POST',
    cuerpo,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};