import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Resena } from "../../Models/Resena.model.ts";
import { EsquemaGuardarResena } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /cliente/resenas
export const obtenerResenas = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjResena = new Resena(idUsuario);
    const resultado = await ObjResena.ObtenerPendientesYEnviadas();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las reseñas" };
  }
};

// POST /cliente/resenas
export const guardarResena = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaGuardarResena.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjResena = new Resena(idUsuario, resultado.data);
    const resultadoGuardar = await ObjResena.Guardar();

    response.status = resultadoGuardar.success ? 201 : 409;
    response.body = resultadoGuardar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible guardar la reseña" };
  }
};