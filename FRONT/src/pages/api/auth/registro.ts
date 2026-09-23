import type { APIRoute } from "astro";
const rutadeno = import.meta.env.API_DENO;
export const POST: APIRoute = async ({ request, redirect }) => {
    
    const body = await request.text();
    
    const respuestaBackend = await fetch(`${rutadeno}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });


    return new Response(await respuestaBackend.text(), {
        status: respuestaBackend.status,
        headers: { "Content-Type": "application/json" },
    });
};
