// src/pages/api/auth/admin/categorias.ts
// proxy BFF: GET /admin/categorias (listar) y POST /admin/categorias (crear)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/admin/categorias', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/admin/categorias', { metodo: 'POST', cuerpo, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};