// proxy bff: get /pago/exito/:idPedido?transaccion=<id>. el backend consulta a wompi,
// aplica el estado real de la transaccion y responde { estado: 'aprobado' | 'rechazado' | 'pendiente' }
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, url, cookies }) => {
  const token = obtenerToken(cookies);

  // el id de la transaccion de wompi viaja como query; si no viene, el backend solo lee el estado guardado
  const transaccion = url.searchParams.get('transaccion');
  const consulta = transaccion ? `?transaccion=${encodeURIComponent(transaccion)}` : '';

  const respuesta = await llamarBackend(`/pago/exito/${params.idPedido}${consulta}`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};