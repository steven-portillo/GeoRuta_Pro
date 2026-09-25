import type { APIRoute } from "astro";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id, accion } = params;
  const API_DENO = import.meta.env.API_DENO ?? "http://127.0.0.1:8002";

  const respuestaBackend = await fetch(`${API_DENO}/api/empresa/proveedores/${id}/${accion}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });

  return new Response(await respuestaBackend.text(), {
    status: respuestaBackend.status,
    headers: { "Content-Type": "application/json" },
  });
};