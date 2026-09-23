import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import { EsquemaCambiarEstadoPedido } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// GET /proveedor/pedidos
export const obtenerPedidos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido();
    const resultado = await ObjPedido.ObtenerDetalladosPorRepartidor(idUsuario as number);

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los pedidos" };
  }
};

// POST /proveedor/pedidos/cambiar-estado
export const cambiarEstado = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCambiarEstadoPedido.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(resultado.data.idPedido);
    const resultadoCambio = await ObjPedido.CambiarEstadoComoRepartidor(
      idUsuario as number,
      resultado.data.nuevoEstado,
    );

    response.status = resultadoCambio.success ? 200 : 403;
    response.body = resultadoCambio;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el estado" };
  }
};