import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { PedidoCliente } from "../../Model/Cliente/PedidoClienteModel.ts";

function idCliente(ctx: Context): number {
  return Number((ctx.state.user as { sub?: string }).sub);
}

export const listarPedidosCliente = async (ctx: Context) => {
  try {
    const filas = await PedidoCliente.Listar(idCliente(ctx));
    const normalizarEstado = (estado: unknown) => {
      const valor = String(estado ?? "");
      return valor === "Aprobado" || valor === "Asignado"
        ? "En preparacion"
        : valor;
    };
    const pedidos = filas.map((pedido: Record<string, unknown>) => ({
      id: Number(pedido.id_pedido),
      total: Number(pedido.total),
      fecha: pedido.fecha_pedido
        ? new Date(String(pedido.fecha_pedido)).toISOString()
        : "",
      estado: normalizarEstado(pedido.estado),
      empresa: pedido.nombre_empresa,
      empresaLogo: pedido.empresa_logo ?? "",
      direccion: pedido.direccion_texto,
      alias: pedido.alias ?? "",
      metodoPago: pedido.metodo_pago,
      pagoConfirmado: Boolean(Number(pedido.pago_confirmado)),
      totalItems: Number(pedido.total_items ?? 0),
    }));
    const estados = pedidos.map((pedido: { estado: string }) =>
      pedido.estado.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase());
    const ahora = new Date();
    const mesActual = ahora.toISOString().slice(0, 7);
    const pedidoActivo = filas.find((pedido: Record<string, unknown>) => {
      const estado = normalizarEstado(pedido.estado).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return estado !== "entregado" && estado !== "cancelado";
    });
    const pedidoActivoNormalizado = pedidoActivo
      ? {
        id: Number(pedidoActivo.id_pedido),
        estado: normalizarEstado(pedidoActivo.estado),
        empresa: pedidoActivo.nombre_empresa,
        total: Number(pedidoActivo.total),
        direccion: pedidoActivo.direccion_texto,
        productosLista: pedidoActivo.productos_lista ?? "",
        totalItems: Number(pedidoActivo.total_items ?? 0),
      }
      : null;
    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      data: pedidos,
      pedidos,
      pedidoActivo: pedidoActivoNormalizado,
      metricas: {
        total: pedidos.length,
        enTransito: estados.filter((estado: string) =>
          estado === "en transito"
        ).length,
        entregados: estados.filter((estado: string) =>
          estado === "entregado"
        ).length,
        cancelados: estados.filter((estado: string) =>
          estado === "cancelado"
        ).length,
        pendientes: estados.filter((estado: string) =>
          estado === "pendiente"
        ).length,
        totalGastado: filas.reduce(
          (total: number, pedido: Record<string, unknown>) =>
            total + (Number(pedido.pago_confirmado) === 1
              ? Number(pedido.total)
              : 0),
          0,
        ),
        esteMes: filas.filter((pedido: Record<string, unknown>) =>
          pedido.fecha_pedido &&
          new Date(String(pedido.fecha_pedido)).toISOString().slice(0, 7) ===
            mesActual
        ).length,
      },
    };
  } catch (error) {
    console.error("Error listar pedidos de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const obtenerPedidoCliente = async (
  ctx: RouterContext<"/api/cliente/pedidos/:id">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de pedido inválido" };
      return;
    }
    const pedido = await PedidoCliente.Obtener(idCliente(ctx), id_pedido);
    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Pedido no encontrado" };
      return;
    }
    ctx.response.status = 200;
    const normalizarEstado = (estado: unknown) => {
      const valor = String(estado ?? "");
      return valor === "Aprobado" || valor === "Asignado"
        ? "En preparacion"
        : valor;
    };
    ctx.response.body = {
      success: true,
      data: {
        cabecera: {
          id: Number(pedido.id_pedido),
          fecha: new Date(String(pedido.fecha_pedido)).toISOString(),
          total: Number(pedido.total),
          metodoPago: pedido.metodo_pago,
          pagoConfirmado: Boolean(Number(pedido.pago_confirmado)),
          observaciones: pedido.observaciones ?? "",
          estado: normalizarEstado(pedido.estado),
          empresa: pedido.nombre_empresa,
          empresaLogo: pedido.empresa_logo ?? "",
          direccion: pedido.direccion_texto,
          alias: pedido.alias ?? "",
          latitud: pedido.latitud,
          longitud: pedido.longitud,
          estadoPago: pedido.metodo_pago === "contra_entrega"
            ? "contra_entrega"
            : pedido.estado_pago ?? "pendiente",
          pasarela: pedido.pasarela ?? "",
          codigoEntrega: pedido.metodo_pago === "contra_entrega" &&
              !["entregado", "cancelado"].includes(
                normalizarEstado(pedido.estado).normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "").toLowerCase(),
              )
            ? pedido.codigo_entrega ?? ""
            : "",
          fechaPago: pedido.fecha_pago
            ? new Date(String(pedido.fecha_pago)).toISOString()
            : "",
        },
        items: pedido.productos.map((item: Record<string, unknown>) => ({
          ...item,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precio_unitario),
          subtotal: Number(item.subtotal),
          imagenUrl: item.imagenUrl ?? "",
        })),
      },
    };
  } catch (error) {
    console.error("Error obtener pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const crearPedidoCliente = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const id_empresa = Number(body.id_empresa);
    const id_direccion = Number(body.id_direccion);
    const metodo_pago = body.metodo_pago === "online"
      ? "online"
      : body.metodo_pago === "contra_entrega"
      ? "contra_entrega"
      : null;
    const items = Array.isArray(body.items)
      ? body.items.map((item: Record<string, unknown>) => ({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
      }))
      : [];
    const observaciones = body.observaciones === undefined ||
        body.observaciones === null
      ? undefined
      : String(body.observaciones).trim();
    if (
      !Number.isSafeInteger(id_empresa) || id_empresa <= 0 ||
      !Number.isSafeInteger(id_direccion) || id_direccion <= 0 ||
      !metodo_pago ||
      items.length === 0 ||
      (observaciones !== undefined && observaciones.length > 2000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Empresa, dirección, método de pago o productos inválidos",
      };
      return;
    }
    const resultado = await PedidoCliente.CrearDesdeItems(
      idCliente(ctx),
      id_empresa,
      id_direccion,
      items,
      metodo_pago,
      observaciones || undefined,
    );
    ctx.response.status = resultado.success ? 201 : 400;
    ctx.response.body = resultado.success
      ? {
        ...resultado,
        data: {
          idPedido: resultado.id_pedido,
          total: resultado.total,
          metodoPago: resultado.metodo_pago,
        },
      }
      : resultado;
  } catch (error) {
    console.error("Error crear pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const cancelarPedidoCliente = async (
  ctx: RouterContext<"/api/cliente/pedidos/:id/cancelar">,
) => {
  try {
    const id_pedido = Number(ctx.params.id);
    const body = await ctx.request.body.json();
    const motivo = body.motivo === undefined || body.motivo === null
      ? undefined
      : String(body.motivo).trim();
    if (
      !Number.isSafeInteger(id_pedido) || id_pedido <= 0 ||
      (motivo !== undefined && motivo.length > 1000)
    ) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID o motivo inválido" };
      return;
    }
    const resultado = await PedidoCliente.Cancelar(
      idCliente(ctx),
      id_pedido,
      motivo || undefined,
    );
    ctx.response.status = resultado.success ? 200 : 400;
    ctx.response.body = resultado;
  } catch (error) {
    console.error("Error cancelar pedido de cliente:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
