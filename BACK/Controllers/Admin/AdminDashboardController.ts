import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Dashboard } from "../../Models/Dashboard.model.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /admin/inicio/metricas
export const obtenerMetricasInicio = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjDashboard = new Dashboard(idEmpresa);
    const resultado = await ObjDashboard.ObtenerMetricasInicio();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las métricas" };
  }
};