import type { APIRoute } from "astro";

const API_DENO = import.meta.env.API_DENO ?? "http://127.0.0.1:8002";

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await request.text();

  const res = await fetch(`${API_DENO}/api/perfil/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};