import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

const cambiarEstado: APIRoute = async ({ request, cookies }) => {
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
        JSON.stringify({ success: false, message: 'ID de pedido requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!estado || !String(estado).trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'El estado es obligatorio' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const respuesta = await llamarBackend('/api/admin/pedidos/cambiar-estado', {
      metodo: 'PATCH',
      cuerpo: { id, estado: String(estado).trim() },
      token,
    });

    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error al cambiar el estado del pedido' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const PATCH = cambiarEstado;
export const POST = cambiarEstado;