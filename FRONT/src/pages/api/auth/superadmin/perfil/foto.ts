// src/pages/api/auth/superadmin/perfil/foto.ts
// proxy BFF para la foto de perfil del superadmin (POST /superadmin/perfil/foto, multipart)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  const respuesta = await llamarBackend('/superadmin/perfil/foto', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};