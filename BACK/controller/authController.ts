import { Context } from "../dependencies/dependencias.ts";
import { UsuarioModel } from "../model/usuarioModel.ts";
import { crear_token } from "../helper/JWT.ts";

export const loginGoogle = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const { credential } = await request.body.json();

    if (!credential || typeof credential !== "string") {
      response.status = 400;
      response.body = { success: false, message: "Token de Google requerido" };
      return;
    }

    // Verificar token con Google
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
    );

    if (!googleRes.ok) {
      response.status = 401;
      response.body = { success: false, message: "Token de Google inválido" };
      return;
    }

    const googleUser = await googleRes.json();
    const email = googleUser.email as string | undefined;

    if (!email) {
      response.status = 400;
      response.body = { success: false, message: "El token no contiene email" };
      return;
    }

    // Buscar o crear usuario
    let usuario = await UsuarioModel.buscarPorEmail(email);

    if (!usuario) {
      const nombreCompleto = (googleUser.name as string) || "Usuario Google";
      const partes = nombreCompleto.trim().split(" ");
      const nombre = partes[0] || "Usuario";
      const apellido = partes.slice(1).join(" ") || "";

      const idNuevo = await UsuarioModel.crearUsuarioGoogle({
        nombre,
        apellido,
        email,
        imagen_url: googleUser.picture || null,
      });

      usuario = await UsuarioModel.buscarPorId(idNuevo);
    }

    if (!usuario || !usuario.activo) {
      response.status = 403;
      response.body = { success: false, message: "Usuario no autorizado" };
      return;
    }

    // Generar JWT
    const token = await crear_token(String(usuario.id_usuario));

    response.status = 200;
    response.body = {
      success: true,
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        id_rol: usuario.id_rol,
        nombre_rol: usuario.nombre_rol,
        imagen_url: usuario.imagen_url,
      },
    };
  } catch (error) {
    console.error("Error login Google:", error);
    response.status = 500;
    response.body = { success: false, message: "Error en el servidor" };
  }
};