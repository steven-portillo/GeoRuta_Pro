import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const id = params.id;
  if (!obtenerToken(cookies)) {
    return new Response(
      JSON.stringify({ success: false, message: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!id) {
    return new Response(
      JSON.stringify({ success: false, message: 'ID de pedido requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const respuesta = await llamarBackend(`/admin/pedidos/${id}`, {
      token: obtenerToken(cookies),
    });
    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al obtener el detalle del pedido:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al obtener el detalle del pedido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
