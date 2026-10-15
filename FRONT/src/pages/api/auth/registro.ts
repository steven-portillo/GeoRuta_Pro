import type { APIRoute } from "astro";

export const prerender = false;

const API_DENO = import.meta.env.API_DENO;
const respuestaJson = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const cuerpo = await request.json().catch(() => null);

    const nombre = String(cuerpo?.nombre ?? "").trim();
    const apellido = String(cuerpo?.apellido ?? "").trim();
    const email = String(cuerpo?.email ?? "").trim();
    const password = String(cuerpo?.password ?? "");

    // validación mínima (el backend vuelve a validar todo)
    if (!nombre || !apellido || !email || !password) {
      return respuestaJson(
        {
          success: false,
          message: "Faltan campos obligatorios: nombre, apellido, email, password",
        },
        400,
      );
    }

    // Llamada directa al backend Deno
    let resDeno: Response;
    try {
      resDeno = await fetch(`${API_DENO}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, email, password }),
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

    if (!resDeno.ok || !datos?.success) {
      return respuestaJson(
        {
          success: false,
          message: datos?.message ?? "No fue posible crear la cuenta",
        },
        resDeno.status >= 400 ? resDeno.status : 400,
      );
    }

    // Lo que consume RegistroForm.astro
    return respuestaJson(
      {
        success: true,
        message: datos.message ?? "Cuenta creada correctamente",
        id: datos.id ?? null,
      },
      201,
    );
  } catch (error) {
    console.error("Error registro Astro:", error);
    return respuestaJson(
      { success: false, message: "No fue posible crear la cuenta" },
      500,
    );
  }
};