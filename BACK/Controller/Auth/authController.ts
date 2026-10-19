// Controller/Auth/authController.ts
import { Context } from "../../Dependencies/dependencias.ts";
import { Usuario } from "../../Model/Auth/UsuarioModel.ts";
import { GoogleAuth } from "../../Model/Auth/GoogleModel.ts";
import { crearToken } from "../../Helpers/Jwt.ts";
import {
  generarRutaArchivo,
  escribirArchivo,
  validarArchivo,
} from "../../Helpers/archivos.ts";
import { enviarCorreo } from "../../Helpers/mailer.ts";
import {
  plantillaBienvenidaCliente,
  plantillaRegistroEmpresaAdmin,
  plantillaNuevaEmpresaSuperAdmin,
} from "../../Helpers/emailTemplates.ts";

const GOOGLE_CLIENT_ID =
  "326172460152-tf164aeq7s3p3nqotj1ml221dgsrl6i0.apps.googleusercontent.com";

/** POST /api/auth/login */
export const iniciarSesion = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const contentLength = request.headers.get("Content-Length");
    if (contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        message: "El cuerpo de la solicitud está vacío",
      };
      return;
    }

    const body = await request.body.json();

    if (!body.email || !body.password) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Email y contraseña son obligatorios",
      };
      return;
    }

    const objUsuario = new Usuario({
      email: body.email,
      password: body.password,
    });
    const result = await objUsuario.IniciarSesion();

    if (result.success && result.data) {
      const token = await crearToken({
        id: result.data.idUsuario,
        rol: result.data.rol,
        id_empresa: result.data.idEmpresa,
      });

      response.status = 200;
      response.body = {
        success: true,
        accessToken: token,
        data: {
          id: result.data.idUsuario,
          nombreCompleto: `${result.data.nombre} ${result.data.apellido}`,
          email: result.data.email,
          rol: result.data.rol,
          idRol: result.data.idRol,
          idEmpresa: result.data.idEmpresa,
        },
      };
    } else {
      response.status = 401;
      response.body = { success: false, message: result.message };
    }
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

/** POST /api/auth/google */
export const loginGoogle = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();
    const credential = body.credential;

    if (!credential || typeof credential !== "string") {
      response.status = 400;
      response.body = {
        success: false,
        message: "Token de Google requerido",
      };
      return;
    }

    // Verificar el token con Google
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );

    if (!googleRes.ok) {
      response.status = 401;
      response.body = {
        success: false,
        message: "Token de Google inválido o expirado",
      };
      return;
    }

    const googleUser = await googleRes.json();

    if (googleUser.aud !== GOOGLE_CLIENT_ID) {
      response.status = 401;
      response.body = {
        success: false,
        message: "Token no corresponde a esta aplicación",
      };
      return;
    }

    const email = googleUser.email as string | undefined;
    if (!email) {
      response.status = 400;
      response.body = {
        success: false,
        message: "No se pudo obtener el email de Google",
      };
      return;
    }

    // tokeninfo devuelve email_verified como string "true"
    if (String(googleUser.email_verified) !== "true") {
      response.status = 401;
      response.body = {
        success: false,
        message: "El correo de Google no está verificado",
      };
      return;
    }

    const resultado = await GoogleAuth.LoginORegistrar({
      email,
      nombre: (googleUser.given_name || googleUser.name || "Usuario") as string,
      apellido: (googleUser.family_name || "") as string,
      imagenUrl: (googleUser.picture || null) as string | null,
    });

    if (!resultado.success) {
      response.status = 400;
      response.body = resultado;
      return;
    }

    // Mismo formato que iniciarSesion
    response.status = 200;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno al iniciar sesión con Google",
    };
  }
};

/** POST /api/auth/register -> Solo para registrar clientes (rol 4) */
export const registrarCliente = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();

    const nombre = body.nombre ?? body.nombres;
    const apellido = body.apellido ?? body.apellidos;
    const { email, password } = body;

    if (!nombre || !apellido || !email || !password) {
      response.status = 400;
      response.body = {
        success: false,
        message:
          "Faltan campos obligatorios: nombre, apellido, email, password",
      };
      return;
    }

    // Validación básica de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    const objUsuario = new Usuario(null, {
      nombre,
      apellido,
      email,
      password,
    });

    const result = await objUsuario.Registrar();

    if (result.success) {
      const { asunto, html, texto } = plantillaBienvenidaCliente(nombre);
      enviarCorreo(email, asunto, html, texto);
      response.status = 201;
      response.body = { success: true, message: result.message, id: result.id };
    } else {
      response.status = 400;
      response.body = { success: false, message: result.message };
    }
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

/** POST /api/auth/register-empresa */
export const registrarEmpresa = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const form = await request.body.formData();

    const nombreEmpresa = String(form.get("nombreEmpresa") ?? "").trim();
    const descripcionEmpresa = String(
      form.get("descripcionEmpresa") ?? "",
    ).trim();
    const nombreAdmin = String(form.get("nombreAdmin") ?? "").trim();
    const apellidoAdmin = String(form.get("apellidoAdmin") ?? "").trim();
    const emailAdmin = String(form.get("emailAdmin") ?? "").trim();
    const passwordAdmin = String(form.get("passwordAdmin") ?? "").trim();
    const logo = form.get("logoEmpresa");
    let logoValidado: File | null = null;

    if (
      !nombreEmpresa ||
      !nombreAdmin ||
      !apellidoAdmin ||
      !emailAdmin ||
      !passwordAdmin
    ) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Faltan campos obligatorios",
      };
      return;
    }

    if (logo !== null) {
      if (!(logo instanceof File)) {
        response.status = 400;
        response.body = {
          success: false,
          message: "El logo enviado no es un archivo válido",
        };
        return;
      }

      const errorLogo = validarArchivo(logo);
      if (errorLogo) {
        response.status = 400;
        response.body = { success: false, message: errorLogo };
        return;
      }

      logoValidado = logo;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdmin)) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    if (passwordAdmin.length < 8) {
      response.status = 400;
      response.body = {
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      };
      return;
    }

    // Ruta calculada de antemano, pero el archivo todavía no se escribe en disco
    const rutaLogo = logoValidado
      ? generarRutaArchivo(logoValidado, "logos")
      : undefined;

    const usuario = new Usuario(null, null, {
      nombreEmpresa,
      descripcionEmpresa: descripcionEmpresa || undefined,
      logoEmpresa: rutaLogo,
      nombreAdmin,
      apellidoAdmin,
      emailAdmin,
      passwordAdmin,
    });

    const resultado = await usuario.RegistrarEmpresa();

    if (!resultado.success) {
      response.status = 400;
      response.body = resultado;
      return;
    }

    // Correo 2: aviso al admin que se registró (sin await, no bloquea).
    const correoAdmin = plantillaRegistroEmpresaAdmin(
      nombreAdmin,
      nombreEmpresa,
    );
    enviarCorreo(
      emailAdmin,
      correoAdmin.asunto,
      correoAdmin.html,
      correoAdmin.texto,
    );

    // Correo 3: aviso al SuperAdmin. Si falla algo aquí, no debe afectar
    // el registro, que ya quedó confirmado en la BD.
    try {
      const emailSuperAdmin = await Usuario.ObtenerEmailSuperAdmin();
      if (emailSuperAdmin) {
        const correoSuper = plantillaNuevaEmpresaSuperAdmin(
          nombreEmpresa,
          nombreAdmin,
          apellidoAdmin,
          emailAdmin,
        );
        enviarCorreo(
          emailSuperAdmin,
          correoSuper.asunto,
          correoSuper.html,
          correoSuper.texto,
        );
      } else {
        console.warn(
          "No se encontró un SuperAdmin activo para avisarle del nuevo registro.",
        );
      }
    } catch (error) {
      console.error("No se pudo preparar el aviso al SuperAdmin:", error);
    }

    // Si la transacción ya confirmó en BD, ahora sí se escribe el archivo físico
    if (logoValidado && rutaLogo) {
      await escribirArchivo(logoValidado, rutaLogo);
    }

    response.status = 201;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};

/** POST /api/auth/logout */
export const cerrarSesion = async (ctx: Context) => {
  await ctx.cookies.set("token", null, {
    httpOnly: true,
    maxAge: 0,
  });

  ctx.response.status = 200;
  ctx.response.body = {
    success: true,
    message: "Sesión cerrada correctamente",
  };
};