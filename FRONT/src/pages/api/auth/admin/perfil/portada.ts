import type { APIRoute } from 'astro';
import { obtenerToken } from '../../../../../lib/Backend';

export const POST: APIRoute = ({ cookies }) => {
  if (!obtenerToken(cookies)) {
    return new Response(
      JSON.stringify({ success: false, message: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: 'El esquema actual de empresa no incluye una imagen de portada.',
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
};