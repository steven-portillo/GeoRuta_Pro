// src/pages/api/auth/proveedor/ws-token.ts
// entrega el jwt al navegador SOLO para abrir el websocket de rastreo.
// el backend (RastreoController) exige el token como query param porque el navegador no puede
// mandar headers en un websocket, y la cookie es httpOnly (el js no la puede leer).
// el middleware ya limita /api/auth/proveedor al rol PROVEEDOR.
import type { APIRoute } from 'astro';
import { obtenerToken } from '../../../../lib/Backend';

export const GET: APIRoute = ({ cookies }) => {
  const token = obtenerToken(cookies);

  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'Sin sesión' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};