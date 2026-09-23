// src/lib/Backend.ts
import type { AstroCookies } from 'astro';

// nombre de la cookie httponly donde guardamos el jwt (mismo patron que en eventos-academicos)
const NOMBRE_COOKIE = 'jwt_token';

// forma en la que responde siempre el backend deno/oak: success/message fijos,
// data opcional, y a veces claves extra (ej. metricas, pedidos, serieDiaria)
interface RespuestaBackend<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  [clave: string]: unknown;
}

interface OpcionesLlamada {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: Record<string, unknown> | FormData;
  token?: string;
}

// arma el fetch hacia el backend deno, agrega el header authorization si hay
// token, y serializa el cuerpo segun sea json (objeto) o form-data (archivos)
export async function llamarBackend<T = unknown>(
  ruta: string,
  opciones: OpcionesLlamada = {},
): Promise<{ status: number; datos: RespuestaBackend<T> }> {
  const { metodo = 'GET', cuerpo, token } = opciones;

  const encabezados: HeadersInit = {};
  if (token) {
    encabezados['Authorization'] = `Bearer ${token}`;
  }

  let cuerpoFinal: BodyInit | undefined;
  if (cuerpo instanceof FormData) {
    // form-data (ej. subir foto de perfil, crear resena con imagen): no se
    // fija content-type a mano, el runtime pone el boundary correcto solo
    cuerpoFinal = cuerpo;
  } else if (cuerpo) {
    encabezados['Content-Type'] = 'application/json';
    cuerpoFinal = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(`${import.meta.env.BACKEND_URL}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: cuerpoFinal,
  });

  let datos: RespuestaBackend<T>;
  try {
    datos = await respuesta.json();
  } catch {
    datos = { success: false, message: 'Respuesta invalida del backend' };
  }

  return { status: respuesta.status, datos };
}

// lee el jwt guardado en la cookie httponly. sirve tanto desde paginas .astro
// (Astro.cookies) como desde rutas api/*.ts (context.cookies) porque astro
// usa el mismo tipo AstroCookies en ambos lugares
export function obtenerToken(cookies: AstroCookies): string | undefined {
  return cookies.get(NOMBRE_COOKIE)?.value;
}

export { NOMBRE_COOKIE };