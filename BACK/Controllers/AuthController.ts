import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Usuario } from "../Models/Usuario.model.ts";
import { EsquemaLogin } from "../Helpers/EsquemasValidacion.ts";
import { EsquemaLoginGoogle } from "../Helpers/EsquemasValidacion.ts";
import { verificarTokenGoogle } from "../Helpers/VerificarGoogle.ts";
import { AuthGoogle } from "../Models/AuthGoogle.model.ts";

// valida credenciales y devuelve el jwt si son correctas
export const login = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaLogin.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const ObjUsuario = new Usuario(null, resultado.data);
    const resultadoLogin = await ObjUsuario.iniciarSesion();

    response.status = resultadoLogin.success ? 200 : 401;
    response.body = resultadoLogin;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};
// login y registro con google: el boton entrega un id token, aqui se verifica y se crea la sesion
export const loginGoogle = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaLoginGoogle.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const claims = await verificarTokenGoogle(resultado.data.credencial);

    if (!claims) {
      response.status = 401;
      response.body = { success: false, message: "No se pudo verificar tu cuenta de Google" };
      return;
    }

    // si google no manda nombre separado, se usa el name o la parte local del correo
    const nombre = (claims.given_name ?? claims.name ?? claims.email.split("@")[0]).slice(0, 100);
    const apellido = (claims.family_name ?? "").slice(0, 100);

    const ObjGoogle = new AuthGoogle({ email: claims.email, nombre, apellido });
    const resultadoGoogle = await ObjGoogle.IniciarSesion();

    response.status = resultadoGoogle.success ? 200 : resultadoGoogle.prohibido ? 403 : 500;
    response.body = {
      success: resultadoGoogle.success,
      message: resultadoGoogle.message,
      data: resultadoGoogle.data,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};