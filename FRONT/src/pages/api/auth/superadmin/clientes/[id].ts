import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

function respuestaJson(datos: unknown, status: number): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ cookies, params }) => {
  const token = obtenerToken(cookies);
  const id = Number(params.id);
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return respuestaJson({ success: false, message: 'ID de cliente inválido' }, 400);
  }

  try {
    const respuesta = await llamarBackend(`/api/admin/superadmin/clientes/${id}`, { token });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al cargar el cliente:', error);
    return respuestaJson({ success: false, message: 'No se pudo cargar el cliente' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const token = obtenerToken(cookies);
  const id = Number(params.id);
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return respuestaJson({ success: false, message: 'ID de cliente inválido' }, 400);
  }

  try {
    const formData = await request.formData();
    const respuesta = await llamarBackend(`/api/admin/superadmin/clientes/${id}`, {
      metodo: 'PUT',
      cuerpo: formData,
      token,
    });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al actualizar el cliente:', error);
    return respuestaJson({ success: false, message: 'No se pudo actualizar el cliente' }, 500);
  }
};