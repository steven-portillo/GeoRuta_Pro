// src/pages/api/auth/logout.ts
import type { APIRoute } from 'astro';

export const prerender = false;

const API_DENO = import.meta.env.API_DENO;

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** POST /api/auth/logout -> avisa al backend y borra la cookie en Astro */
export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Aviso al backend. Si falla, igual cerramos la sesión en el front.
    await fetch(`${API_DENO}/api/auth/logout`, { method: 'POST' }).catch(
      (error) => console.error('No se pudo avisar al backend del logout:', error),
    );
  } finally {
    // La cookie la creó Astro en login.ts, así que Astro es quien debe borrarla.
    // path debe ser el mismo que al crearla, o el navegador no la elimina.
    cookies.delete('token', { path: '/' });
  }

  return json({ success: true, message: 'Sesión cerrada correctamente' }, 200);
};