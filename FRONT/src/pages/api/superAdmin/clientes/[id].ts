import type { APIRoute } from "astro";

const API_DENO = import.meta.env.API_DENO;

export const GET: APIRoute = async ({ cookies, params }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const res = await fetch(`${API_DENO}/api/admin/superadmin/clientes/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const token = cookies.get("token")?.value;
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, message: "No autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const formData = await request.formData();

  const res = await fetch(`${API_DENO}/api/admin/superadmin/clientes/${params.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};