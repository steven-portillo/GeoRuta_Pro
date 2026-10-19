// src/pages/api/auth/proveedor/perfil/foto.ts
// proxy bff para la foto de perfil (POST /proveedor/perfil/foto, multipart con el campo "foto")
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  // se reenvia el mismo formdata: llamarBackend no fija content-type a mano con un formdata,
  // asi el runtime pone el boundary correcto
  const respuesta = await llamarBackend('/proveedor/perfil/foto', {
    metodo: 'POST',
    cuerpo: formData,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};