// src/pages/api/auth/admin/repartidores/[id]/pedidos.ts
// proxy BFF: GET /admin/repartidores/:id/pedidos (para el modal "Ver repartidor")
import type { APIRoute } from 'astro';

type OpcionesSolicitud = {
  metodo?: string;
  token?: string | null;
  cuerpo?: unknown;
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
};

async function solicitarAPI<T = any>(ruta: string, opciones: OpcionesSolicitud = {}): Promise<{ ok: boolean; status: number; datos: { [clave: string]: any; data?: T; success?: boolean; message?: string; error?: string } }> {
  const { metodo = 'GET', token, cuerpo, headers: encabezadosIniciales, query, timeoutMs = 20_000 } = opciones;
  const absoluta = /^https?:\/\//i.test(ruta);
  const rutaNormalizada = absoluta || ruta.startsWith('/') ? ruta : `/${ruta}`;
  const requiereApi = !absoluta && !rutaNormalizada.startsWith('/api') && !rutaNormalizada.startsWith('/ws') && !rutaNormalizada.startsWith('/img');
  const baseUrl = import.meta.env.API_DENO ?? 'http://127.0.0.1:8005';
  const url = new URL(absoluta ? rutaNormalizada : `${baseUrl.replace(/\/+$/, '')}${requiereApi ? '/api' : ''}${rutaNormalizada}`);
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null) url.searchParams.set(clave, String(valor));
  }
  const headers = new Headers(encabezadosIniciales);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (cuerpo !== undefined && cuerpo !== null && metodo.toUpperCase() !== 'GET' && metodo.toUpperCase() !== 'HEAD') {
    if (typeof cuerpo === 'string' || cuerpo instanceof FormData || cuerpo instanceof URLSearchParams || (typeof Blob !== 'undefined' && cuerpo instanceof Blob) || (typeof ArrayBuffer !== 'undefined' && cuerpo instanceof ArrayBuffer)) {
      body = cuerpo as BodyInit;
    } else {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      body = JSON.stringify(cuerpo);
    }
  }
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const respuesta = await fetch(url, { method: metodo, headers, body, signal: controller.signal });
    const texto = await respuesta.text();
    let datos: any = { success: respuesta.ok, message: 'Sin contenido' };
    if (texto) {
      try { datos = JSON.parse(texto); }
      catch { datos = { success: false, message: texto }; }
    }
    return { ok: respuesta.ok, status: respuesta.status, datos };
  } catch (error) {
    console.error(`Error al llamar al backend (${ruta}):`, error);
    return { ok: false, status: 502, datos: { success: false, message: error instanceof Error ? error.message : 'Error al contactar con el backend' } };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
export const GET: APIRoute = async ({ params, cookies }) => {
  const idRepartidor = params.id;
  const token = cookies.get('token')?.value ?? '';

  const respuesta = await solicitarAPI(`/admin/repartidores/${idRepartidor}/pedidos`, { token });

  return new Response(JSON.stringify(respuesta.datos), {
    status: respuesta.status,
    headers: { 'Content-Type': 'application/json' },
  });
};