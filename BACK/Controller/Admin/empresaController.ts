import { Context } from "../../Dependencies/dependencias.ts";
import { EmpresaModel } from "../../Model/Admin/EmpresaModel.ts";
import { Sesion } from "../../Utils/tipos.ts";


export const colorEmpresa = async(ctx:Context) => {
    const {response, state} = ctx;
    try {
        const sesion = state.user as Sesion;
        if (!sesion || !sesion.idEmpresa) {
            response.status = 403;
            response.body = { success: false, message: "No autorizado"};
            return;
        }

        const data = await EmpresaModel.tomarColorEmpresa(Number(sesion.idEmpresa));
        response.status = 200;
        response.body = data;
    } catch (error) {
        console.log("error auth empresa color: " + error);
        response.status = 500;
        response.body = { success: false,
            message: "Error interno del servidor"
        }
    }
}


export const actualizarColorEmpresa = async (ctx: Context) => {
  const { request, response, state } = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion || !sesion.idEmpresa) {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const body = await request.body.json();
    const colorPrimario = body.color_primario;

    console.log("LLEGA AL CONTROLLER");
    const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
    if (typeof colorPrimario !== "string" || !HEX_REGEX.test(colorPrimario)) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Color inválido. Debe ser un hex de 6 dígitos, ej: #3b82f6",
      };
      return;
    }

    const resultado = await EmpresaModel.actualizarColorEmpresa(
      Number(sesion.idEmpresa),
      colorPrimario
    );

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
  } catch (error) {
    console.log("error auth actualizar color empresa: " + error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};