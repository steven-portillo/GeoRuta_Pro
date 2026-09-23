import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { UbicacionProveedor } from "../../Models/UbicacionProveedorModel.ts";
import { EsquemaGuardarUbicacion } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// POST /proveedor/ubicacion
export const guardarUbicacion = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaGuardarUbicacion.safeParse(cuerpo);

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
    if (!idUsuario) {
      response.status = 401;
      response.body = { success: false, message: "Sin permisos" };
      return;
    }

    const ObjUbicacion = new UbicacionProveedor(idUsuario, resultado.data);
    const resultadoGuardar = await ObjUbicacion.ActualizarUbicacion();

    response.status = resultadoGuardar.success ? 200 : 400;
    response.body = resultadoGuardar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible guardar la ubicación" };
  }
};