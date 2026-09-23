import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Usuario } from "../Models/Usuario.model.ts";
import { EsquemaLogin } from "../Helpers/EsquemasValidacion.ts";

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