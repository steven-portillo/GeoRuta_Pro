// src/pages/img/[...ruta].ts
// proxy de imagenes: el navegador pide /img/* al propio astro (el mismo host de la pagina,
// sea localhost o ngrok) y astro las trae del backend deno, que es quien las guarda y las
// sirve desde ./public/img. antes esto redirigia a BACKEND_URL (localhost:8000) y desde el
// celular ese localhost es el telefono, por eso las fotos salian rotas por ngrok
import type { APIRoute } from 'astro';

// solo se reenvian los encabezados que sirven para mostrar y cachear la imagen
const ENCABEZADOS_A_REENVIAR = ['content-type', 'etag', 'last-modified'];
const ENCABEZADOS_CONDICIONALES = ['if-none-match', 'if-modified-since'];

export const GET: APIRoute = async ({ params, request }) => {
  const ruta = params.ruta ?? '';
  const backendUrl = import.meta.env.BACKEND_URL;

  // se arma la url y se confirma que sigue dentro de /img/. sin esto, una ruta con ".." o
  // "%2e%2e" se normalizaria y podria llegar a cualquier otra ruta del backend
  const destino = new URL(`/img/${ruta}`, backendUrl);
  if (!destino.pathname.startsWith('/img/')) {
    return new Response('No encontrado', { status: 404 });
  }

  // si el navegador ya tiene la imagen, se le pregunta al backend si cambio (responde 304)
  const encabezadosPeticion: Record<string, string> = {};
  for (const nombre of ENCABEZADOS_CONDICIONALES) {
    const valor = request.headers.get(nombre);
    if (valor) encabezadosPeticion[nombre] = valor;
  }

  try {
    const respuesta = await fetch(destino, { headers: encabezadosPeticion });

    const encabezados = new Headers();
    for (const nombre of ENCABEZADOS_A_REENVIAR) {
      const valor = respuesta.headers.get(nombre);
      if (valor) encabezados.set(nombre, valor);
    }
    // las fotos de perfil se sobrescriben con el mismo nombre (usuario_{id}), asi que no se
    // pueden cachear "para siempre": no-cache hace que el navegador la guarde pero pregunte antes de usarla
    encabezados.set('Cache-Control', 'no-cache');

    // una respuesta 304 no puede llevar cuerpo
    return new Response(respuesta.status === 304 ? null : respuesta.body, {
      status: respuesta.status,
      headers: encabezados,
    });
  } catch (error) {
    console.error(error);
    return new Response('No se pudo obtener la imagen', { status: 502 });
  }
};