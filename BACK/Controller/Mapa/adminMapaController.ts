import { Context } from "../../Dependencies/dependencias.ts";
import { AdminMapaModel } from "../../Model/Mapa/adminMapaModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const listarRepartidoresMapaAdmin = async (ctx: Context) => {
  const { response, state, request } = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion || sesion.rol !== "ADMIN") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const idEmpresa = Number(
      (sesion as Sesion & { idEmpresa?: number }).idEmpresa,
    );
    if (!idEmpresa) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Sesión sin idEmpresa",
      };
      return;
    }

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new AdminMapaModel().listarRepartidoresEmpresa(
      idEmpresa,
      q,
    );

    response.status = 200;
    response.body = { success: true, data };
  } catch (error) {
    console.error("listarRepartidoresMapaAdmin:", error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error al listar repartidores",
    };
  }
};