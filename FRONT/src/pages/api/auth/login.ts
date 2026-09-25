import type { APIRoute } from "astro";
const rutadeno = import.meta.env.API_DENO;
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    
    const body = await request.json();
    
    const respuestaBackend = await fetch(`${rutadeno}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: body.email,
            password: body.password,
        }),
    });

    const data = await respuestaBackend.json();

    if (!data.success) {
        return new Response(JSON.stringify(data), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    console.log("este es el token que llega de deno despues del login: "+data.accessToken);
    cookies.set("token", data.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
    });

    return new Response(
        JSON.stringify({ success: true, usuario: data.data }),
        { status: 200, headers: { "Content-Type": "application/json" } },
    );
};
