import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { pedidosModel, repartidorModel } from "../../Model/pruebasMapa/pruebasModel.ts";
import { Sesion } from "../../Utils/tipos.ts";

export const getDestinosRutaProveedor = async (ctx: Context) => {
  const { response, state } = ctx;
  try {
    const sesion = state.user as Sesion; 
    if (!sesion || sesion.rol !== "PROVEEDOR") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }
    const data = await new repartidorModel().destinosRutaProveedor(sesion.id);
    console.log("Destinos obtenidos: ", data);
    response.status = 200;
    response.body = { success: true, data };
  } catch (e) {
    response.status = 500;
    response.body = { success: false, message: "Error al obtener destinos" };
  }
};

export const pedidosEnTransitoCliente = async (ctx:Context) => {
  const {response, state} = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion || sesion.rol !== "CLIENTE" ) {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const data = await new pedidosModel().pedidosEnTransitoCliente(sesion.id);
    response.status = 200;
    response.body = {success: true, data};
  } catch (error) {
   console.log("error en controller pruebas DestinosENTranCli: " + error);
   response.status = 500;
   response.body ={ success: false, message: "Error al obtener pedidos" };
  }
}


export const destinosEnRutaProveedor = async (ctx: Context) => {
  const { response, state } = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion || sesion.rol !== "PROVEEDOR") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }
    console.log("Obteniendo destinos en ruta para proveedor: ", sesion.id);
    const data = await new repartidorModel().destinosRutaProveedor(sesion.id);
    console.log("Destinos obtenidos para proveedor: ", data);
    response.status = 200;
    response.body = { success: true, data };
  }
  catch (error) {
    console.error("Error en controller pruebas DestinosEnRutaProveedor: " + error);
    response.status = 500;
    response.body = { success: false, message: "Error al obtener destinos" };
  }
}