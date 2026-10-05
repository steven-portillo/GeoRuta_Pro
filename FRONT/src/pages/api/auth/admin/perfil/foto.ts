// src/pages/api/auth/admin/perfil/foto.ts
// proxy BFF para la foto de perfil del admin (POST /admin/perfil/foto, multipart)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  const respuesta = await llamarBackend('/admin/perfil/foto', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};