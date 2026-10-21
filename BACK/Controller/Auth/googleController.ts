import { Context } from "../../Dependencies/dependencias.ts";
import { plantillaBienvenidaCliente } from "../../Helpers/emailTemplates.ts";
import { enviarCorreo } from "../../Helpers/mailer.ts";
import { verificarGoogleIdToken } from "../../Helpers/googleIdentity.ts";
import { crearToken } from "../../Helpers/Jwt.ts";
import { GoogleUsuario } from "../../Model/Auth/GoogleUsuarioModel.ts";

export const iniciarSesionGoogle = async (ctx: Context) => {
  try {
    const body: unknown = await ctx.request.body.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Solicitud inválida" };
      return;
    }

    const idToken = (body as Record<string, unknown>).credential;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")?.trim();
    if (
      typeof idToken !== "string" || !idToken ||
      idToken.length > 10_000 || !clientId
    ) {
      ctx.response.status = clientId ? 400 : 503;
      ctx.response.body = {
        success: false,
        message: clientId
          ? "Credencial de Google inválida"
          : "El inicio de sesión con Google no está configurado",
      };
      return;
    }

    const identity = await verificarGoogleIdToken(idToken, clientId);
    if (!identity) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No se pudo verificar la cuenta de Google",
      };
      return;
    }

    const resultado = await GoogleUsuario.IniciarOCrearCliente({
      sub: identity.sub,
      email: identity.email,
      nombre: identity.given_name,
      apellido: identity.family_name,
      imagen_url: identity.picture,
    });
    if (!resultado.success) {
      ctx.response.status = 403;
      ctx.response.body = resultado;
      return;
    }

    const accessToken = await crearToken({
      id: resultado.data.idUsuario,
      rol: resultado.data.rol,
      id_empresa: resultado.data.idEmpresa,
    });
    if (resultado.creado) {
      const correo = plantillaBienvenidaCliente(resultado.data.nombre);
      await enviarCorreo(
        resultado.data.email,
        correo.asunto,
        correo.html,
        correo.texto,
      );
    }

    ctx.response.status = resultado.creado ? 201 : 200;
    ctx.response.body = {
      success: true,
      accessToken,
      data: {
        id: resultado.data.idUsuario,
        nombreCompleto: `${resultado.data.nombre} ${resultado.data.apellido}`,
        email: resultado.data.email,
        rol: resultado.data.rol,
        idRol: resultado.data.idRol,
        idEmpresa: resultado.data.idEmpresa,
      },
    };
  } catch (error) {
    console.error("Error en autenticación Google:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
