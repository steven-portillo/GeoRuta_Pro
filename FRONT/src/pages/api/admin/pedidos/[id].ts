import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const API_DENO = import.meta.env.API_DENO;
  const respuesta = await fetch(`${API_DENO}/api/admin/pedidos/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return new Response(await respuesta.text(), {
    status: respuesta.status,
    headers: { "Content-Type": "application/json" },
  });
};