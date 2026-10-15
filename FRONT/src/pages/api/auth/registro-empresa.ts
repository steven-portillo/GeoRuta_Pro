import type { APIRoute } from "astro";

export const prerender = false;

const DENO_URL = "http://127.0.0.1:8005";

const respuestaJson = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // validación mínima (el backend vuelve a validar todo)
    const obligatorios = [
      "nombreEmpresa",
      "nombreAdmin",
      "apellidoAdmin",
      "emailAdmin",
      "passwordAdmin",
    ];
    const faltan = obligatorios.some(
      (campo) => !String(formData.get(campo) ?? "").trim(),
    );
    if (faltan) {
      return respuestaJson(
        { success: false, message: "Faltan campos obligatorios" },
        400,
      );
    }

    // si no se eligió logo, el navegador manda un File vacío: se descarta
    const logo = formData.get("logoEmpresa");
    if (logo instanceof File && logo.size === 0) {
      formData.delete("logoEmpresa");
    }

    // OJO: no agregar el header Content-Type, fetch lo genera con el boundary
    const resDeno = await fetch(`${DENO_URL}/api/auth/register-empresa`, {
      method: "POST",
      body: formData,
    });

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

    return respuestaJson(
      datos ?? { success: false, message: "Respuesta vacía del backend" },
      resDeno.status,
    );
  } catch (error) {
    console.error("Error registro-empresa Astro:", error);
    return respuestaJson(
      { success: false, message: "No fue posible enviar la solicitud" },
      500,
    );
  }
};