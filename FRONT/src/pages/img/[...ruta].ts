// proxy de archivos estáticos: reenvía /img/* hacia el backend deno (que es
// quien realmente guarda y sirve las imágenes en ./public/img). sin esto el
// navegador pide las imágenes contra el propio Astro y siempre da 404
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const ruta = params.ruta ?? '';
  const backendUrl = import.meta.env.BACKEND_URL;
  return Response.redirect(`${backendUrl}/img/${ruta}`, 302);
};