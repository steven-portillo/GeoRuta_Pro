import { RouterContext } from "../Dependencies/Dependencias.ts";
import { Usuario } from "../Models/Usuario.model.ts";
import { EsquemaRegistro } from "../Helpers/EsquemasValidacion.ts";

// autoregistro publico de un cliente nuevo — equivalente a POST /Registro/Registrar del original
export const registrar = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaRegistro.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const ObjUsuario = new Usuario(null, null, resultado.data);
    const resultadoRegistro = await ObjUsuario.CrearUsuario();

    response.status = resultadoRegistro.success ? 201 : 409;
    response.body = resultadoRegistro;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};