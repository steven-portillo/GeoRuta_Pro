// src/pages/api/auth/proveedor/perfil/datos.ts
// proxy bff para guardar nombre/apellido/email/telefono (POST /proveedor/perfil en el backend)
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/proveedor/perfil', { metodo: 'POST', cuerpo, token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};