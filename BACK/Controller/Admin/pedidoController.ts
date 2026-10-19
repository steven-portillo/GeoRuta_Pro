import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Pedido } from "../../Model/Admin/PedidoModel.ts";

/** GET /api/admin/pedidos */
export const listarPedidos = async (ctx: Context) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const filas = await Pedido.Listar(usuario.id_empresa);
    const fechaISO = (valor: unknown) => {
      const fecha = new Date(String(valor));
      return Number.isNaN(fecha.getTime())
        ? ""
        : fecha.toISOString().slice(0, 10);
    };
    const hoy = new Date().toISOString().slice(0, 10);
    const mes = hoy.slice(0, 7);
    const metricas = {
      pendientes: filas.filter((pedido: Record<string, unknown>) =>
        pedido.estado === "Pendiente"
      ).length,
      enTransito: filas.filter((pedido: Record<string, unknown>) =>
        pedido.estado === "En transito" || pedido.estado === "En tránsito"
      ).length,
      entregadosHoy: filas.filter((pedido: Record<string, unknown>) =>
        pedido.estado === "Entregado" && fechaISO(pedido.fecha) === hoy
      ).length,
      canceladosMes: filas.filter((pedido: Record<string, unknown>) =>
        pedido.estado === "Cancelado" && fechaISO(pedido.fecha).startsWith(mes)
      ).length,
    };
    const pedidos = filas.map((pedido: Record<string, unknown>) => ({
      ...pedido,
      id: Number(pedido.id),
      total: Number(pedido.total),
      totalItems: Number(pedido.totalItems),
      pagoConfirmado: Boolean(Number(pedido.pagoConfirmado)),
      estado: pedido.estado === "Aprobado" ? "En preparacion" : pedido.estado,
      fecha: pedido.fecha
        ? new Date(String(pedido.fecha)).toLocaleString("es-CO")
        : "",
    }));
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: pedidos, pedidos, metricas };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** GET /api/admin/pedidos/:id */
export const obtenerPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const pedido = await Pedido.ObtenerDetalle(id_pedido, usuario.id_empresa);
    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }

    ctx.response.status = 200;
    const estado = pedido.estado === "Aprobado"
      ? "En preparacion"
      : pedido.estado;
    const id = Number(pedido.id_pedido);
    const items = pedido.productos.map((item: Record<string, unknown>) => ({
      id: Number(item.id_producto),
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precio_unitario),
      subtotal: Number(item.subtotal),
      imagenUrl: item.imagenUrl,
    }));
    ctx.response.body = {
      success: true,
      data: {
        cabecera: {
          id,
          total: Number(pedido.total),
          fecha: new Date(String(pedido.fecha_pedido)).toLocaleString("es-CO"),
          estado,
          cliente: `${pedido.nombre_cliente} ${pedido.apellido_cliente}`.trim(),
          clienteEmail: pedido.email_cliente,
          direccion: pedido.direccion_texto,
          latitud: pedido.latitud === null ? null : Number(pedido.latitud),
          longitud: pedido.longitud === null ? null : Number(pedido.longitud),
          metodoPago: pedido.metodo_pago,
          pagoConfirmado: Boolean(Number(pedido.pago_confirmado)),
          estadoPago: pedido.estado_pago ?? "pendiente",
          repartidor: pedido.nombre_proveedor
            ? `${pedido.nombre_proveedor} ${pedido.apellido_proveedor ?? ""}`.trim()
            : null,
        },
        items,
      },
    };
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const aprobarPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/aprobar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }
    const resultado = await Pedido.Aprobar(id_pedido, usuario.id_empresa);
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error aprobar pedido:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const entregarPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/entregar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number; sub: string };
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }
    const resultado = await Pedido.Entregar(
      id_pedido,
      usuario.id_empresa,
      Number(usuario.sub),
    );
    ctx.response.status = resultado.success ? 200 : 409;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error al completar entrega desde administración:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/pedidos/:id/asignar */
export const asignarProveedor = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/asignar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const id_proveedor = Number(body.id_proveedor);
    const notas = body.notas ? String(body.notas).trim() : undefined;

    if (!id_proveedor) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "id_proveedor es obligatorio",
      };
      return;
    }

    const resultado = await Pedido.AsignarProveedor(
      id_pedido,
      usuario.id_empresa,
      id_proveedor,
      notas,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

/** PATCH /api/admin/pedidos/:id/cancelar */
export const cancelarPedido = async (
  ctx: RouterContext<"/api/admin/pedidos/:id/cancelar">,
) => {
  try {
    const usuario = ctx.state.user as { id_empresa: number; sub: string };
    const id_pedido = Number(ctx.params.id);

    if (Number.isNaN(id_pedido)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID inválido" };
      return;
    }

    const body = await ctx.request.body.json();
    const motivo = String(body.motivo ?? "").trim();

    if (!motivo) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "El motivo es obligatorio",
      };
      return;
    }

    const id_usuario = Number(usuario.sub);
    const resultado = await Pedido.Cancelar(
      id_pedido,
      usuario.id_empresa,
      id_usuario,
      motivo,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error(error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
