import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const formData = await request.formData();
    const respuesta = await llamarBackend('/admin/perfil/logo', {
      metodo: 'POST',
      cuerpo: formData,
      token,
    });
    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al subir el logo de la empresa:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al subir el logo de la empresa' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};