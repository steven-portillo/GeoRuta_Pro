// src/pages/api/auth/admin/productos.ts
// proxy BFF: GET /admin/productos (listar) y POST /admin/productos (crear/editar, form-data)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = async ({ cookies }) => {
  const token = obtenerToken(cookies);
  const respuesta = await llamarBackend('/admin/productos', { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  // el formulario de productos siempre llega como form-data (por la imagen opcional)
  const formData = await request.formData();

  const respuesta = await llamarBackend('/admin/productos', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};