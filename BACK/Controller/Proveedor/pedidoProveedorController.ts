import { Context } from "../../Dependencies/dependencias.ts";
import { EsquemaConfirmarEntrega } from "../../Helpers/esquemaValidaciones.ts";
import { PedidoProveedor } from "../../Model/Proveedor/PedidoProveedorModel.ts";

function obtenerIdProveedor(ctx: Context): number {
  const id = Number((ctx.state.user as { sub?: string }).sub);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("El token no contiene un ID de proveedor válido");
  }
  return id;
}

function normalizarPedidos(pedidos: Record<string, unknown>[]) {
  return pedidos.map((pedido) => ({
    ...pedido,
    id: Number(pedido.id),
    total: Number(pedido.total),
    totalItems: Number(pedido.totalItems),
    estado: pedido.estado === "Asignado" || pedido.estado === "Aprobado"
      ? "En preparacion"
      : pedido.estado,
    latitud: pedido.latitud === null ? null : Number(pedido.latitud),
    longitud: pedido.longitud === null ? null : Number(pedido.longitud),
  }));
}

export const listarPedidosProveedor = async (ctx: Context) => {
  try {
    const pedidos = await PedidoProveedor.Listar(obtenerIdProveedor(ctx));
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: normalizarPedidos(pedidos) };
  } catch (error) {
    console.error("Error al listar pedidos del repartidor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar los pedidos asignados",
    };
  }
};

export const obtenerDatosInicioProveedor = async (ctx: Context) => {
  try {
    const filas = await PedidoProveedor.Listar(obtenerIdProveedor(ctx));
    const pedidos = normalizarPedidos(filas as Record<string, unknown>[]);
    const estados = pedidos.map((pedido) =>
      String(pedido.estado).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    );
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      metricas: {
        total: pedidos.length,
        enTransito: estados.filter((estado) => estado === "en transito").length,
        entregados: estados.filter((estado) => estado === "entregado").length,
        pendientes: estados.filter((estado) =>
          estado === "pendiente" || estado === "en preparacion"
        ).length,
      },
      pedidos: pedidos.slice(0, 10),
    };
  } catch (error) {
    console.error("Error al cargar el inicio del repartidor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar el resumen del repartidor",
    };
  }
};

export const listarNotificacionesProveedor = async (ctx: Context) => {
  try {
    const resultado = await PedidoProveedor.ObtenerNotificaciones(
      obtenerIdProveedor(ctx),
    );
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: resultado.notificaciones,
      noLeidas: resultado.noLeidas,
    };
  } catch (error) {
    console.error("Error al listar notificaciones del repartidor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible cargar las notificaciones",
    };
  }
};

export const marcarNotificacionesProveedorLeidas = async (ctx: Context) => {
  try {
    await PedidoProveedor.MarcarNotificacionesLeidas(obtenerIdProveedor(ctx));
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Notificaciones marcadas como leídas",
    };
  } catch (error) {
    console.error("Error al marcar notificaciones del repartidor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible actualizar las notificaciones",
    };
  }
};

export const cambiarEstadoPedidoProveedor = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const id_pedido = Number(body.idPedido ?? body.id_pedido);
    const estado = String(body.nuevoEstado ?? body.estado ?? "");
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de pedido inválido" };
      return;
    }
    if (estado !== "En transito" && estado !== "Entregado") {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Estado no permitido" };
      return;
    }

    const codigo = body.codigo === undefined || body.codigo === null
      ? undefined
      : String(body.codigo);
    if (codigo !== undefined) {
      const validacion = EsquemaConfirmarEntrega.safeParse({
        idPedido: id_pedido,
        codigo,
      });
      if (!validacion.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: validacion.error.issues[0]?.message ??
            "El código de entrega no es válido",
        };
        return;
      }
    }

    const resultado = await PedidoProveedor.CambiarEstado(
      id_pedido,
      obtenerIdProveedor(ctx),
      estado,
      codigo,
    );
    ctx.response.status = resultado.success ? 200 : 409;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error al actualizar pedido del repartidor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "No fue posible actualizar el estado del pedido",
    };
  }
};
