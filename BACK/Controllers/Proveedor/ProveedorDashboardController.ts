import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /proveedor/inicio/datos — metricas + ultimos 5 pedidos asignados
export const obtenerDatos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario, idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(null, idEmpresa);

    const [metricas, pedidos] = await Promise.all([
      ObjPedido.ObtenerMetricasRepartidor(idUsuario as number),
      ObjPedido.ObtenerPorRepartidor(idUsuario as number),
    ]);

    if (!metricas.success || !pedidos.success) {
      response.status = 400;
      response.body = { success: false, message: "No fue posible obtener los datos del inicio" };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      message: "Datos obtenidos",
      metricas: metricas.data,
      pedidos: (pedidos.data as unknown[]).slice(0, 5), // top 5 para el dashboard
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los datos del inicio" };
  }
};