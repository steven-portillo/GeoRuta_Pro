import type { APIRoute } from "astro";
const rutadeno = import.meta.env.API_DENO;
export const POST: APIRoute = async ({ request, redirect }) => {
    
    const formdata = await request.formData();
    
    const respuestaBackend = await fetch(`${rutadeno}/api/auth/register-empresa`, {
        method: "POST",
        body:formdata
    });


    return new Response(await respuestaBackend.text(), {
        status: respuestaBackend.status,
        headers: { "Content-Type": "application/json" },
    });
};