import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const API_DENO = import.meta.env.API_DENO;
  const body = await request.text();

  const respuestaBackend = await fetch(`${API_DENO}/api/empresa/crear-proveedor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  return new Response(await respuestaBackend.text(), {
    status: respuestaBackend.status,
    headers: { "Content-Type": "application/json" },
  });
};