import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Repartidor } from "../../Models/Repartidor.model.ts";
import { notificarAsignacionPedido, notificarNuevoRepartidor } from "../../Helpers/EnviarNotificaciones.ts";
import { Pedido } from "../../Models/Pedido.model.ts";
import {
  EsquemaGuardarRepartidor,
  EsquemaAsignarRepartidor,
  EsquemaActualizarCredencialesRepartidor,
} from "../../Helpers/EsquemasValidacion.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";



// POST /admin/repartidores
// POST /admin/repartidores
export const guardarRepartidor = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaGuardarRepartidor.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjRepartidor = new Repartidor(idEmpresa, resultado.data);
    const resultadoCrear = await ObjRepartidor.Crear();

    // correo de bienvenida al repartidor (sin contraseña)
    if (resultadoCrear.success && idEmpresa) {
      notificarNuevoRepartidor(idEmpresa, resultado.data.nombre, resultado.data.apellido, resultado.data.email);
    }

    response.status = resultadoCrear.success ? 201 : 409;
    response.body = resultadoCrear;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible crear el repartidor" };
  }
};

// GET /admin/repartidores
export const obtenerRepartidores = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjRepartidor = new Repartidor(idEmpresa);
    const resultado = await ObjRepartidor.ObtenerPorEmpresa();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los repartidores" };
  }
};

// GET /admin/repartidores/disponibles
export const obtenerRepartidoresDisponibles = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjRepartidor = new Repartidor(idEmpresa);
    const resultado = await ObjRepartidor.ObtenerDisponibles();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los repartidores disponibles" };
  }
};

// POST /admin/repartidores/asignar
// POST /admin/repartidores/asignar
export const asignarRepartidor = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaAsignarRepartidor.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(resultado.data.idPedido, idEmpresa);
    const resultadoAsignacion = await ObjPedido.AsignarRepartidor(
      resultado.data.idRepartidor,
      resultado.data.notas ?? null,
    );

    // le avisa al cliente que su pedido ya tiene repartidor
    if (resultadoAsignacion.success) notificarAsignacionPedido(resultado.data.idPedido);

    response.status = resultadoAsignacion.success ? 200 : 400;
    response.body = resultadoAsignacion;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible asignar el repartidor" };
  }
};

// GET /admin/repartidores/:id/pedidos
export const obtenerPedidosRepartidor = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idRepartidor = Number(params.id);
    if (!idRepartidor) {
      response.status = 400;
      response.body = { success: false, message: "Id de repartidor inválido" };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjPedido = new Pedido(null, idEmpresa);
    const resultado = await ObjPedido.ObtenerPorRepartidor(idRepartidor);

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los pedidos del repartidor" };
  }
};
// POST /admin/repartidores/:id/credenciales
export const actualizarCredencialesRepartidor = async (ctx: RouterContext<string>) => {
  const { request, response, params } = ctx;
  try {
    const idRepartidor = Number(params.id);
    if (!idRepartidor) {
      response.status = 400;
      response.body = { success: false, message: "Id de repartidor inválido" };
      return;
    }

    const cuerpo = await request.body.json();
    const resultado = EsquemaActualizarCredencialesRepartidor.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjRepartidor = new Repartidor(idEmpresa);
    const { codigo, ...respuesta } = await ObjRepartidor.ActualizarCredenciales(
      idRepartidor,
      resultado.data.email,
      resultado.data.password,
    );

    response.status = respuesta.success ? 200 : (codigo ?? 400);
    response.body = respuesta;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible actualizar el repartidor" };
  }
};