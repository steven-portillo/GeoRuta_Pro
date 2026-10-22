import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { ClienteMapaModel } from "../../Model/Mapa/clienteMapaModel.ts";
import { leerSesionMapa } from "../../Utils/tipos.ts";

export const pedidosEnTransitoCliente = async (ctx: Context) => {
  const { response, state } = ctx;
  try {
    const sesion = leerSesionMapa(state.user);
    if (!sesion || sesion.rol !== "CLIENTE") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const data = await new ClienteMapaModel().pedidosEnTransitoCliente(
      sesion.id,
    );
    response.status = 200;
    response.body = { success: true, data };
  } catch (error) {
    console.error("pedidosEnTransitoCliente:", error);
    response.status = 500;
    response.body = { success: false, message: "Error al obtener pedidos" };
  }
};

export const listarRepartidoresMapaCliente = async (ctx: Context) => {
  const { response, state, request } = ctx;
  try {
    const sesion = leerSesionMapa(state.user);
    if (!sesion || sesion.rol !== "CLIENTE") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const q = request.url.searchParams.get("q") ?? undefined;
    const data = await new ClienteMapaModel().listarRepartidoresDeCliente(
      sesion.id,
      q,
    );
    response.status = 200;
    response.body = { success: true, data };
  } catch (error) {
    console.error("listarRepartidoresMapaCliente:", error);
    response.status = 500;
    response.body = { success: false, message: "Error al listar repartidores" };
  }
};

export const pedidoDetalleMapaCliente = async (
  ctx: RouterContext<string>,
) => {
  const { response, state, params } = ctx;
  try {
    const sesion = leerSesionMapa(state.user);
    if (!sesion || sesion.rol !== "CLIENTE") {
      response.status = 403;
      response.body = { success: false, message: "No autorizado" };
      return;
    }

    const idPedido = Number(params.id);
    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
      response.status = 400;
      response.body = { success: false, message: "Id inválido" };
      return;
    }

    const data = await new ClienteMapaModel().detallePedidoCliente(
      sesion.id,
      idPedido,
    );
    if (!data) {
      response.status = 404;
      response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }

    response.status = 200;
    response.body = { success: true, data };
  } catch (error) {
    console.error("pedidoDetalleMapaCliente:", error);
    response.status = 500;
    response.body = { success: false, message: "Error al obtener detalle" };
  }
};
