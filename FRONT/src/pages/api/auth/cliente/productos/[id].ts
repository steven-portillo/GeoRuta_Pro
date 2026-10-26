import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = obtenerToken(cookies);
  const id = Number(params.id);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ success: false, message: 'ID de producto inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const respuesta = await llamarBackend(`/cliente/productos/${id}`, { token });
    return new Response(JSON.stringify(respuesta.datos), {
      status: respuesta.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error al cargar el detalle del producto:', error);
    return new Response(JSON.stringify({ success: false, message: 'No se pudo cargar el producto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
