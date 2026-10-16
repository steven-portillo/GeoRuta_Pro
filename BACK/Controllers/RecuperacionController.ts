import { RouterContext } from "../Dependencies/Dependencias.ts";
import { MINUTOS_VIGENCIA, RecuperacionPassword } from "../Models/RecuperacionPassword.model.ts";
import {
  EsquemaRestablecerPassword,
  EsquemaSolicitarRecuperacion,
} from "../Helpers/EsquemasValidacion.ts";
import { enviarCodigoRecuperacion } from "../Helpers/EnviarCodigoRecuperacion.ts";

// genera el codigo y lo envia. se llama SIN await desde el controller para que la
// respuesta tarde lo mismo exista o no el correo (si no, el tiempo delataria los correos registrados)
async function procesarSolicitud(email: string): Promise<void> {
  const ObjRecuperacion = new RecuperacionPassword({ email });
  const resultado = await ObjRecuperacion.GenerarCodigo();

  // si no existe el usuario o se pidio hace poco, no pasa nada: solo no se envia correo
  if (!resultado.success) return;

  const enviado = await enviarCodigoRecuperacion(
    resultado.data.email,
    resultado.data.nombre,
    resultado.data.codigo,
    MINUTOS_VIGENCIA,
  );

  if (!enviado) console.error(`no se pudo enviar el codigo de recuperacion a ${resultado.data.email}`);
}

// paso 1: el usuario pide un codigo. la respuesta es siempre la misma
export const solicitarRecuperacion = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaSolicitarRecuperacion.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    procesarSolicitud(resultado.data.email).catch((error) => console.error(error));

    response.status = 200;
    response.body = {
      success: true,
      message: "Si el correo está registrado, te enviamos un código de verificación",
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};

// paso 2: el usuario manda el codigo y la contraseña nueva
export const restablecerPassword = async (ctx: RouterContext<string>) => {
  const { response, request } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaRestablecerPassword.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const ObjRecuperacion = new RecuperacionPassword(null, resultado.data);
    const resultadoRestablecer = await ObjRecuperacion.Restablecer();

    response.status = resultadoRestablecer.success ? 200 : 400;
    response.body = resultadoRestablecer;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible completar la operación" };
  }
};