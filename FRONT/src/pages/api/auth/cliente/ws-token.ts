// src/pages/api/auth/cliente/ws-token.ts
// entrega el jwt al navegador SOLO para abrir el websocket de rastreo.
// el middleware ya limita /api/auth/cliente al rol CLIENTE.
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
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};