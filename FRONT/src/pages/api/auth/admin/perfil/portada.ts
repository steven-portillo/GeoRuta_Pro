// src/pages/api/auth/admin/perfil/portada.ts
// proxy BFF para la portada de la empresa (POST /admin/perfil/portada-empresa, multipart)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  const respuesta = await llamarBackend('/admin/perfil/portada-empresa', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};