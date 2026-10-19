// BFF para crear una intención de pago Wompi usando el pedido guardado en el backend.
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = obtenerToken(cookies);
  const cuerpo = await request.json();

  const respuesta = await llamarBackend('/pago/crear-intencion', {
    metodo: 'POST',
    cuerpo,
    token,
  });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};