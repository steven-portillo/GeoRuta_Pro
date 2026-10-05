// src/pages/api/auth/admin/perfil/logo.ts
// proxy BFF para el logo de la empresa (POST /admin/perfil/logo-empresa, multipart)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  const respuesta = await llamarBackend('/admin/perfil/logo-empresa', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};