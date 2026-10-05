// src/pages/api/auth/registro.ts
import type { APIRoute } from 'astro';
import { llamarBackend } from '../../../lib/Backend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const cuerpo = await request.json();

    // el registro no inicia sesion automaticamente (a diferencia de login.ts),
    // asi que aqui no hay token ni cookie que guardar — solo se reenvia la
    // respuesta del backend tal cual
    const { status, datos } = await llamarBackend('/registro', { metodo: 'POST', cuerpo });

    return new Response(JSON.stringify(datos), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ success: false, message: 'No fue posible completar el registro' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};