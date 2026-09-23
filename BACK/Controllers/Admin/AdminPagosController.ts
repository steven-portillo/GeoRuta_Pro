import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Pago } from "../../Models/Pago.model.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /admin/pagos — vista de "billetera" del admin
export const obtenerPagos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPago = new Pago(idEmpresa);

    const [metricas, pagos, serieDiaria] = await Promise.all([
      ObjPago.ObtenerMetricas(),
      ObjPago.ObtenerListado(),
      ObjPago.ObtenerSerieDiaria(),
    ]);

    if (!metricas.success || !pagos.success || !serieDiaria.success) {
      response.status = 400;
      response.body = { success: false, message: "No fue posible obtener los pagos" };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      message: "Pagos obtenidos",
      metricas: metricas.data,
      pagos: pagos.data,
      serieDiaria: serieDiaria.data,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los pagos" };
  }
};