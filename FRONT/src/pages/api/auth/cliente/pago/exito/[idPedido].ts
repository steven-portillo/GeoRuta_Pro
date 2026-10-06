// proxy BFF: GET /pago/exito/:idPedido. el backend consulta a stripe, marca el pago como
// aprobado y envia el recibo por correo. se llama justo despues de que stripe confirma el pago
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = obtenerToken(cookies);

  const respuesta = await llamarBackend(`/pago/exito/${params.idPedido}`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};