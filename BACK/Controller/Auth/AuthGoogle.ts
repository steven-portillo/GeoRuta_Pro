import { Context } from "../../Dependencies/dependencias.ts"; // ajusta la ruta
import { UsuarioGoogle } from "../../Model/Auth/UsuarioGoogle.ts"; // ajusta la ruta
import { crearToken } from "../../Helpers/Jwt.ts"; 

/**
 * POST /auth/google
 * Body: { credential: string }  // id_token de Google Identity Services
 *
 * - Verifica el token con Google
 * - Busca o crea usuario (siempre CLIENTE, id_rol = 4)
 * - Devuelve JWT propio de la app
 */
export const loginGoogle = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();
    const credential = body?.credential;

    if (!credential || typeof credential !== "string") {
      response.status = 400;
      response.body = {
        success: false,
        message: "Token de Google (credential) requerido",
      };
      return;
    }

    // 1. Validar id_token con Google
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

    // Opcional pero recomendado: validar que el token sea de TU client_id
    // const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    // if (clientId && googleUser.aud !== clientId) {
    //   response.status = 401;
    //   response.body = { success: false, message: "Token no pertenece a esta app" };
    //   return;
    // }

    const email = googleUser.email as string | undefined;
    if (!email) {
      response.status = 400;
      response.body = {
        success: false,
        message: "El token de Google no incluye email",
      };
      return;
    }

    // 2. Armar nombre / apellido desde el perfil de Google
    const nombreCompleto = (googleUser.name as string) || "Usuario Google";
    const partes = nombreCompleto.trim().split(/\s+/);
    const nombre = partes[0] || "Usuario";
    const apellido = partes.slice(1).join(" ") || "";
    const imagen_url = (googleUser.picture as string) || null;

    // 3. Login o registro automático (CLIENTE)
    const modelo = new UsuarioGoogle();
    const resultado = await modelo.IniciarSesionGoogle({
      nombre,
      apellido,
      email,
      imagen_url,
    });

    if (!resultado.success) {
      response.status = 403;
      response.body = {
        success: false,
        message: resultado.message,
      };
      return;
    }

    const u = resultado.data;

    // 4. JWT de la aplicación (el que usa el middleware de Astro)
    const token = await crearToken({
      id: u.idUsuario,
      rol: u.rol, // "CLIENTE"
      nombre: u.nombre,
      idEmpresa: u.idEmpresa,
    });

    response.status = 200;
    response.body = {
      success: true,
      message: resultado.message,
      token,
      credential,
      data: {
        idUsuario: u.idUsuario,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rol: u.rol,
        idRol: u.idRol,
        idEmpresa: u.idEmpresa,
        imagen_url: u.imagen_url,
      },
    };
  } catch (error) {
    console.error("Error loginGoogle:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error en el servidor",
    };
  }
};