import { Context } from "../../Dependencies/dependencias.ts";
import { ProveedorMapaModel } from "../../Model/Mapa/proveedorMapaModel.ts";
import { leerSesionMapa } from "../../Utils/tipos.ts";

export const destinosEnRutaProveedor = async (ctx: Context) => {
  const { response, state, request } = ctx;
  try {
    const sesion = leerSesionMapa(state.user);
    if (!sesion || sesion.rol !== "PROVEEDOR") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new ProveedorMapaModel().destinosRutaProveedor(
      sesion.id,
      q,
    );

    response.status = 200;
    response.body = {
      success: true,
      data: data.map((d) => ({
        ...d,
        url_detalle: `/repartidor/detalle/${d.id_pedido}/confirmar`,
      })),
    };
  } catch (error) {
    console.error("destinosEnRutaProveedor:", error);
    response.status = 500;
    response.body = { success: false, message: "Error al obtener destinos" };
  }
};
