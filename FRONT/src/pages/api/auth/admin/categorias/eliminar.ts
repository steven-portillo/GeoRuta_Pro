import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const DELETE: APIRoute = async ({ url, cookies }) => {
  try {
    const token = obtenerToken(cookies);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID de categoría requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await llamarBackend(`/api/admin/categorias/${id}/estado`, {
      metodo: 'PATCH',
      cuerpo: { estado: 0 },
      token,
    });

    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al eliminar la categoría' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};