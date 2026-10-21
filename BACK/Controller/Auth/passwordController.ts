import { Context } from "../../Dependencies/dependencias.ts";
import { enviarCorreo } from "../../Helpers/mailer.ts";
import { plantillaRecuperacionPassword } from "../../Helpers/emailTemplates.ts";
import { RecuperacionPassword } from "../../Model/Auth/RecuperacionPasswordModel.ts";

function esEmail(valor: string): boolean {
  return valor.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function enlaceRestablecimiento(token: string): string | undefined {
  const configuredUrl = Deno.env.get("PASSWORD_RESET_URL")?.trim();
  if (!configuredUrl) return undefined;
  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("PASSWORD_RESET_URL debe usar HTTPS fuera de localhost");
    }
    url.searchParams.set("token", token);
    return url.toString();
  } catch (error) {
    console.error("PASSWORD_RESET_URL no es válida:", error);
    return undefined;
  }
}

export const solicitarRestablecimientoPassword = async (ctx: Context) => {
  try {
    const body: unknown = await ctx.request.body.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Solicitud inválida" };
      return;
    }
    const email = (body as Record<string, unknown>).email;
    if (typeof email !== "string" || !esEmail(email.trim())) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    const solicitud = await RecuperacionPassword.Solicitar(
      email.trim().toLowerCase(),
    );
    if (solicitud) {
      const correo = plantillaRecuperacionPassword(
        solicitud.nombre,
        solicitud.token,
        enlaceRestablecimiento(solicitud.token),
      );
      await enviarCorreo(
        solicitud.email,
        correo.asunto,
        correo.html,
        correo.texto,
      );
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message:
        "Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer la contraseña.",
    };
  } catch (error) {
    console.error("Error solicitando restablecimiento:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo procesar la solicitud",
    };
  }
};

export const restablecerPassword = async (ctx: Context) => {
  try {
    const body: unknown = await ctx.request.body.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Solicitud inválida" };
      return;
    }
    const data = body as Record<string, unknown>;
    const token = data.token;
    const password = data.password;
    if (
      typeof token !== "string" || !/^[\da-f]{64}$/i.test(token) ||
      typeof password !== "string" ||
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message:
          "El código o la contraseña no son válidos; usa una contraseña de al menos 8 caracteres",
      };
      return;
    }

    const resultado = await RecuperacionPassword.Restablecer(
      token,
      password,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No se pudo restablecer la contraseña",
    };
  }
};
