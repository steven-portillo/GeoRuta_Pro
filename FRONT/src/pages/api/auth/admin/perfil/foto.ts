import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    const token = obtenerToken(cookies);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await llamarBackend('/api/perfil/foto', {
      metodo: 'DELETE',
      token,
    });

    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al eliminar la foto' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = obtenerToken(cookies);
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const formData = await request.formData();
    const respuesta = await llamarBackend('/api/admin/perfil/foto', {
      metodo: 'POST',
      cuerpo: formData,
      token,
    });
    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al actualizar la foto' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};