import type { APIRoute } from "astro";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const API_DENO = import.meta.env.API_DENO;
  const respuesta = await fetch(`${API_DENO}/api/admin/pedidos/${params.id}/cancelar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: await request.text(),
  });

  return new Response(await respuesta.text(), {
    status: respuesta.status,
    headers: { "Content-Type": "application/json" },
  });
};