import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

function respuestaJson(datos: unknown, status: number): Response {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  if (!token) return respuestaJson({ success: false, message: 'No autorizado' }, 401);

  try {
    const body = await request.json();
    const respuesta = await llamarBackend('/api/admin/inventario/agregar', {
      metodo: 'POST',
      cuerpo: {
        id_producto: Number(body.id_producto),
        cantidad: Number(body.cantidad),
        motivo: String(body.motivo ?? '').trim(),
      },
      token,
    });
    return respuestaJson(respuesta.datos, respuesta.status);
  } catch (error) {
    console.error('Error al agregar stock:', error);
    return respuestaJson({ success: false, message: 'No se pudo agregar el stock' }, 500);
  }
};