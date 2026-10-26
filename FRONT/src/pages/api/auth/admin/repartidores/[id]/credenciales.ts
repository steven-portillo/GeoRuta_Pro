// src/pages/api/auth/admin/repartidores/[id]/credenciales.ts
// proxy BFF: POST /admin/repartidores/:id/credenciales (pestaña "Editar" del modal "Ver repartidor")
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const idRepartidor = params.id;
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend(`/admin/repartidores/${idRepartidor}/credenciales`, {
    metodo: 'POST',
    cuerpo,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};