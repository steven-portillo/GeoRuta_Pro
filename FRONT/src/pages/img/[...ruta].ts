// proxy de archivos estáticos: reenvía /img/* hacia el backend deno (que es
// quien realmente guarda y sirve las imágenes en ./public/img). sin esto el
// navegador pide las imágenes contra el propio Astro y siempre da 404
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const ruta = params.ruta ?? '';
  const backendUrl = import.meta.env.API_DENO ?? 'http://127.0.0.1:8005';
  const destino = new URL(`/img/${ruta}`, `${backendUrl.replace(/\/+$/, '')}/`);
  return Response.redirect(destino, 302);
};