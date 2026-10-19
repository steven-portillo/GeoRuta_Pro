import { Context } from "../../Dependencies/dependencias.ts";
import { InicioAdmin } from "../../Model/Admin/InicioAdminModel.ts";

export const obtenerMetricasInicio = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const metricas = await InicioAdmin.ObtenerMetricas(usuario.id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: metricas };
  } catch (error) {
    console.error("Error al cargar métricas del administrador:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar las métricas del administrador",
    };
  }
};
