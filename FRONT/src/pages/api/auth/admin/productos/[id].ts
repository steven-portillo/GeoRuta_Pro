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
    return respuestaJson({ success: false, message: 'ID de producto inválido' }, 400);
  }

  try {
    const respuesta = await llamarBackend(`/api/admin/productos/${id}`, { token });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al cargar el producto para editar:', error);
    return respuestaJson({ success: false, message: 'No se pudo cargar el producto' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const token = obtenerToken(cookies);
  const id = Number(params.id);
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return respuestaJson({ success: false, message: 'ID de producto inválido' }, 400);
  }

  try {
    const formData = await request.formData();
    const respuesta = await llamarBackend(`/api/admin/productos/${id}`, {
      metodo: 'PUT',
      cuerpo: formData,
      token,
    });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    return respuestaJson({ success: false, message: 'No se pudo actualizar el producto' }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, params, request }) => {
  const token = obtenerToken(cookies);
  const idProducto = Number(params.id);
  const idImagen = Number(new URL(request.url).searchParams.get('idImagen'));
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);
  if (
    !Number.isSafeInteger(idProducto) || idProducto <= 0 ||
    !Number.isSafeInteger(idImagen) || idImagen <= 0
  ) {
    return respuestaJson({ success: false, message: 'ID de producto o imagen inválido' }, 400);
  }

  try {
    const respuesta = await llamarBackend(
      `/api/admin/productos/${idProducto}/imagenes/${idImagen}`,
      { metodo: 'DELETE', token },
    );
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al eliminar la imagen del producto:', error);
    return respuestaJson({ success: false, message: 'No se pudo eliminar la imagen' }, 500);
  }
};
