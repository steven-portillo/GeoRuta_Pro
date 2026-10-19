import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    const token = obtenerToken(cookies);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const cuerpo = await request.json();
    const { id, estado } = cuerpo;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: 'ID de producto requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (![0, 1].includes(estado)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Estado inválido (debe ser 0 o 1)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await llamarBackend(`/api/admin/productos/${id}/estado`, {
      metodo: 'PATCH',
      cuerpo: { estado },
      token,
    });

    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al cambiar el estado del producto' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};