import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import { EsquemaCambiarEstadoPedido } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /admin/pedidos
export const obtenerPedidos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(null, idEmpresa);

    const [metricas, pedidos] = await Promise.all([
      ObjPedido.ObtenerMetricas(),
      ObjPedido.ObtenerPorEmpresa(),
    ]);

    if (!metricas.success || !pedidos.success) {
      response.status = 400;
      response.body = { success: false, message: "No fue posible obtener los pedidos" };
      return;
    }

    response.status = 200;
    response.body = {
      success: true,
      message: "Pedidos obtenidos",
      metricas: metricas.data,
      pedidos: pedidos.data,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los pedidos" };
  }
};

// POST /admin/pedidos/cambiar-estado
export const cambiarEstadoPedido = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCambiarEstadoPedido.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(resultado.data.idPedido, idEmpresa);
    const resultadoCambio = await ObjPedido.CambiarEstado(resultado.data.nuevoEstado);

    response.status = resultadoCambio.success ? 200 : 404;
    response.body = resultadoCambio;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el estado" };
  }
};

// GET /admin/pedidos/:id
export const obtenerDetallePedido = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idPedido = Number(params.id);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Id de pedido inválido" };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(idPedido, idEmpresa);
    const resultado = await ObjPedido.ObtenerDetalle();

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener el detalle del pedido" };
  }
};