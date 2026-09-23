// src/pages/api/cliente/perfil/foto.ts
// proxy BFF para la foto de perfil (POST /cliente/perfil/foto, multipart)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const formData = await request.formData();

  // se reenvia el mismo FormData tal cual: llamarBackend ya sabe no fijarle
  // Content-Type a mano cuando el cuerpo es un FormData (deja que el runtime
  // ponga el boundary correcto)
  const respuesta = await llamarBackend('/cliente/perfil/foto', { metodo: 'POST', cuerpo: formData, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};