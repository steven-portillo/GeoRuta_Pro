//RECORDAR TAMBIEN UNIR AL LOGOUT DEL BACKEND, EL ENDPOINT ES LA RUTABASE/api/auth/logout
import type { APIRoute } from "astro";

const rutadeno = import.meta.env.API_DENO;

export const POST: APIRoute = async ({ cookies }) => {
    cookies.delete("token", { path: "/" });
    const respuesta = await fetch(`${rutadeno}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Typer": "application/json"}
    })
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};