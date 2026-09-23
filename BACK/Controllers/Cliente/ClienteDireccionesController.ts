import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Direccion } from "../../Models/Direccion.model.ts";
import { EsquemaGuardarDireccion, EsquemaEliminarDireccion } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /cliente/direcciones
export const obtenerDirecciones = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjDireccion = new Direccion(null, idUsuario);
    const resultado = await ObjDireccion.ObtenerPorUsuario();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las direcciones" };
  }
};

// POST /cliente/direcciones
export const guardarDireccion = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaGuardarDireccion.safeParse(cuerpo);

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
    const ObjDireccion = new Direccion(null, idUsuario, resultado.data);
    const resultadoCrear = await ObjDireccion.Crear();

    response.status = resultadoCrear.success ? 201 : 400;
    response.body = resultadoCrear;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible guardar la dirección" };
  }
};

// POST /cliente/direcciones/eliminar
export const eliminarDireccion = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaEliminarDireccion.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjDireccion = new Direccion(resultado.data.idDireccion, idUsuario);
    const resultadoEliminar = await ObjDireccion.Eliminar();

    response.status = resultadoEliminar.success ? 200 : 404;
    response.body = resultadoEliminar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible eliminar la dirección" };
  }
};