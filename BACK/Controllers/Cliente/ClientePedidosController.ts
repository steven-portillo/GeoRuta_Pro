import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Direccion } from "../../Models/Direccion.model.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import { EsquemaGuardarDireccion, EsquemaCrearPedido } from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// POST /cliente/direcciones
export const guardarDireccion = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaGuardarDireccion.safeParse(cuerpo);

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
const ObjDireccion = new Direccion(null, idUsuario, resultado.data);
const resultadoGuardar = await ObjDireccion.Crear();

    response.status = resultadoGuardar.success ? 201 : 400;
    response.body = resultadoGuardar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible guardar la dirección" };
  }
};

// POST /cliente/pedidos
export const crearPedido = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCrearPedido.safeParse(cuerpo);

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
    const ObjPedido = new Pedido();
    const resultadoCrear = await ObjPedido.CrearPedidoCliente(idUsuario as number, resultado.data);

    response.status = resultadoCrear.success ? 201 : 400;
    response.body = resultadoCrear;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible crear el pedido" };
  }
};

// GET /cliente/pedidos
export const obtenerPedidos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido();

    const [metricas, pedidos, pedidoActivo] = await Promise.all([
      ObjPedido.ObtenerMetricasCliente(idUsuario as number),
      ObjPedido.ObtenerPorCliente(idUsuario as number),
      ObjPedido.ObtenerPedidoActivoCliente(idUsuario as number),
    ]);

    if (!metricas.success || !pedidos.success || !pedidoActivo.success) {
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
      pedidoActivo: pedidoActivo.data,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los pedidos" };
  }
};

// GET /cliente/pedidos/:id
export const obtenerDetallePedido = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idPedido = Number(params.id);
    if (!idPedido) {
      response.status = 400;
      response.body = { success: false, message: "Id de pedido inválido" };
      return;
    }

    const { idUsuario } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(idPedido);
    const resultado = await ObjPedido.ObtenerDetalleParaCliente(idUsuario as number);

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener el detalle del pedido" };
  }
};