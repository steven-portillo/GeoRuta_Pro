// src/pages/api/cliente/proveedores/[idEmpresa]/productos.ts
import type { APIRoute } from 'astro';
import { llamarBackend, obtenerToken } from '../../../../../../lib/Backend';

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = obtenerToken(cookies);
  const { status, datos } = await llamarBackend(
    `/cliente/proveedores/${params.idEmpresa}/productos`,
    { token },
  );

  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};