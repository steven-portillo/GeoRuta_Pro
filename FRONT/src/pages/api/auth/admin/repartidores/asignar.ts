// src/pages/api/auth/admin/repartidores/asignar.ts
// Proxy BFF: PATCH /admin/repartidores/asignar
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

const asignarRepartidor: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const recibido: unknown = await request.json();
  if (!recibido || typeof recibido !== 'object' || Array.isArray(recibido)) {
    return new Response(
      JSON.stringify({ success: false, message: 'Datos de asignación inválidos' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const cuerpo = recibido as Record<string, unknown>;
  const idPedido = Number(cuerpo.idPedido ?? cuerpo.id_pedido ?? cuerpo.id);
  const idRepartidor = Number(
    cuerpo.idRepartidor ?? cuerpo.id_repartidor ?? cuerpo.idProveedor ??
      cuerpo.id_proveedor,
  );
  if (
    !Number.isSafeInteger(idPedido) || idPedido <= 0 ||
    !Number.isSafeInteger(idRepartidor) || idRepartidor <= 0
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Se requiere un pedido y un repartidor válidos',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const respuesta = await llamarBackend('/admin/repartidores/asignar', {
    metodo: 'PATCH',
    cuerpo: { ...cuerpo, idPedido, idRepartidor },
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH = asignarRepartidor;
export const POST = asignarRepartidor;