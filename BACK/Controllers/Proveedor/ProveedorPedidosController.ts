import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import { EsquemaCambiarEstadoPedido, EsquemaConfirmarEntrega } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";
import { notificarCambioEstadoPedido } from "../../Helpers/EnviarNotificaciones.ts";

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

    // avisa al cliente si el repartidor inicio la ruta o entrego el pedido
    if (resultadoCambio.success) notificarCambioEstadoPedido(resultado.data.idPedido, resultado.data.nuevoEstado);

    response.status = resultadoCambio.success ? 200 : 403;
    response.body = resultadoCambio;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el estado" };
  }
};
// POST /proveedor/pedidos/confirmar-entrega
// POST /proveedor/pedidos/confirmar-entrega
export const confirmarEntrega = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaConfirmarEntrega.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(resultado.data.idPedido);
    const resultadoEntrega = await ObjPedido.ConfirmarEntregaConCodigo(
      idUsuario as number,
      resultado.data.codigo,
    );

    // entrega confirmada con el codigo: avisa al cliente
    if (resultadoEntrega.success) notificarCambioEstadoPedido(resultado.data.idPedido, "Entregado");

    response.status = resultadoEntrega.success ? 200 : 400;
    response.body = resultadoEntrega;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible confirmar la entrega" };
  }
};