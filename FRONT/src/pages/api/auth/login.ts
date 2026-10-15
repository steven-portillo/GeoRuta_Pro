import type { APIRoute } from "astro";

export const prerender = false;

const API_DENO = import.meta.env.API_DENO;
const NOMBRE_COOKIE = "token";
const HORAS_COOKIE = 8;

const NOMBRE_ROL: Record<string, string> = {
  "4": "CLIENTE",
  "1": "SUPERADMIN",
  "2": "ADMIN",
  "3": "PROVEEDOR",
};

const respuestaJson = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const cuerpo = await request.json().catch(() => null);

    if (!cuerpo?.email || !cuerpo?.password) {
      return respuestaJson(
        { success: false, message: "Email y contraseña son obligatorios" },
        400,
      );
    }

    // Llamada directa al backend Deno
    let resDeno: Response;
    try {
      resDeno = await fetch(`${API_DENO}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cuerpo.email,
          password: cuerpo.password,
        }),
      });
    } catch (error) {
      console.error("No se pudo conectar con Deno:", error);
      return respuestaJson(
        { success: false, message: "No fue posible conectar con el servidor" },
        503,
      );
    }

    const texto = await resDeno.text();
    let datos: any = null;
    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      console.error("Deno no devolvió JSON:", resDeno.status, texto);
      return respuestaJson(
        { success: false, message: "Respuesta inválida del backend" },
        502,
      );
    }

    // Credenciales malas (401), cuerpo vacío (400), error interno (500), etc.
    if (!resDeno.ok || !datos?.success || !datos?.data?.token || !datos?.data?.usuario) {
      return respuestaJson(
        {
          success: false,
          message: datos?.message ?? "Email o contraseña incorrectos",
        },
        resDeno.status >= 400 ? resDeno.status : 401,
      );
    }

    const { token, usuario } = datos.data;

    cookies.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: HORAS_COOKIE * 60 * 60,
    });

    const rolCrudo = String(usuario.rol).toUpperCase();

    // Lo que consume LoginForm.astro
    return respuestaJson({
      success: true,
      message: datos.message ?? "Sesión iniciada",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: NOMBRE_ROL[rolCrudo] ?? rolCrudo,
        imagenUrl: usuario.imagenUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Error login Astro:", error);
    return respuestaJson(
      { success: false, message: "No fue posible iniciar sesión" },
      500,
    );
  }
};