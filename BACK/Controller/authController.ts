import { Context } from "../Dependencies/dependencias.ts";
import { Usuario } from "../Model/UsuarioModel.ts";
import { crearToken } from "../Helpers/Jwt.ts";

/** POST /api/login */
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

/** POST /api/register -> Solo para registrar clientes (rol 4) */
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
