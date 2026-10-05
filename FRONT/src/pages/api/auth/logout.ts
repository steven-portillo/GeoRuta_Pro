// src/pages/api/auth/logout.ts
import type { APIRoute } from 'astro';
import { NOMBRE_COOKIE } from '../../../lib/Backend';

export const POST: APIRoute = async ({ cookies }) => {
  // borra la cookie httponly del jwt. no hace falta avisarle al backend deno
  // (el jwt no se invalida server-side, simplemente expira solo a las 8 horas
  // por su campo "exp" — aqui solo dejamos de mandarlo)
  cookies.delete(NOMBRE_COOKIE, { path: '/' });

  return new Response(
    JSON.stringify({ success: true, message: 'Sesion cerrada' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};