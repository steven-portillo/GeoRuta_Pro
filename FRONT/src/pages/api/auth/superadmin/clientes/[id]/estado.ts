import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

function respuestaJson(datos: unknown, status: number): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const token = obtenerToken(cookies);
  const id = Number(params.id);
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return respuestaJson({ success: false, message: 'ID de cliente inválido' }, 400);
  }

  try {
    const body = await request.json();
    const respuesta = await llamarBackend(`/api/admin/superadmin/clientes/${id}/estado`, {
      metodo: 'PATCH',
      cuerpo: { estado: Number(body.estado) },
      token,
    });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al cambiar el estado del cliente:', error);
    return respuestaJson({ success: false, message: 'No se pudo cambiar el estado' }, 500);
  }
};