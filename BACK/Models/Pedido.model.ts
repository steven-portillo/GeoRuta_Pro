import { conexion } from "./Conexion.ts";

interface MetricasPedidosRow {
  pendientes: number | null;
  en_transito: number | null;
  entregados_hoy: number | null;
  cancelados_mes: number | null;
}

interface PedidoListRow {
  id_pedido: number;
  total: number;
  fecha_pedido: Date;
  metodo_pago: string;
  pago_confirmado: number;
  estado: string;
  cliente: string;
  direccion: string | null;
  estado_pago: string | null;
  total_items: number;
  repartidor: string | null;
}

interface DetallePedidoCabeceraRow {
  id_pedido: number;
  total: number;
  fecha_pedido: Date;
  metodo_pago: string;
  pago_confirmado: number;
  observaciones: string | null;
  estado: string;
  cliente: string;
  cliente_email: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  estado_pago: string | null;
  repartidor: string | null;
}

interface DetallePedidoItemRow {
  nombre: string;
  imagen_url: string | null;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}
const _ENVIO_FIJO = 8000;

interface ItemPedidoData {
  idProducto: number;
  cantidad: number;
}

interface CrearPedidoData {
  idEmpresa: number;
  idDireccion: number;
  metodoPago?: string;
  observaciones?: string;
  items: ItemPedidoData[];
}

export class Pedido {
  public _idPedido: number | null;
  public _idEmpresa: number | null;

  constructor(idPedido: number | null = null, idEmpresa: number | null = null) {
    this._idPedido = idPedido;
    this._idEmpresa = idEmpresa;
  }

  // metricas rapidas de pedidos (para las tarjetas del panel de pedidos)
  public async ObtenerMetricas(): Promise<{ success: boolean; message: string; data?: Record<string, number> }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT
           SUM(CASE WHEN ep.nombre_estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
           SUM(CASE WHEN ep.nombre_estado IN ('En transito', 'En tránsito') THEN 1 ELSE 0 END) AS en_transito,
           SUM(CASE WHEN ep.nombre_estado = 'Entregado' AND DATE(p.fecha_entrega) = CURDATE() THEN 1 ELSE 0 END) AS entregados_hoy,
           SUM(CASE WHEN ep.nombre_estado = 'Cancelado' AND MONTH(p.fecha_pedido) = MONTH(CURDATE()) AND YEAR(p.fecha_pedido) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS cancelados_mes
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         WHERE p.id_empresa = ?`,
        [this._idEmpresa],
      );

      const fila = rows?.[0] as MetricasPedidosRow;

      return {
        success: true,
        message: "Métricas obtenidas",
        data: {
          pendientes: fila?.pendientes ?? 0,
          enTransito: fila?.en_transito ?? 0,
          entregadosHoy: fila?.entregados_hoy ?? 0,
          canceladosMes: fila?.cancelados_mes ?? 0,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las métricas" };
    }
  }

  // lista completa de pedidos de la empresa, con datos resumidos de cliente/repartidor/pago
  public async ObtenerPorEmpresa(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.total, p.fecha_pedido, p.metodo_pago, p.pago_confirmado,
           ep.nombre_estado AS estado,
           CONCAT(u.nombre, ' ', u.apellido) AS cliente,
           d.direccion_texto AS direccion,
           pg.estado_pago,
           (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items,
           CONCAT(urep.nombre, ' ', urep.apellido) AS repartidor
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
         LEFT JOIN asignacion_pedido ap ON p.id_pedido = ap.id_pedido
         LEFT JOIN usuarios urep ON ap.id_proveedor = urep.id_usuario
         WHERE p.id_empresa = ?
         ORDER BY p.fecha_pedido DESC`,
        [this._idEmpresa],
      );

      const pedidos = (rows as PedidoListRow[]).map((fila) => ({
        id: fila.id_pedido,
        total: fila.total,
        fecha: fila.fecha_pedido,
        estado: fila.estado,
        cliente: fila.cliente,
        direccion: fila.direccion ?? "No disponible",
        metodoPago: fila.metodo_pago,
        pagoConfirmado: Boolean(fila.pago_confirmado),
        estadoPago: fila.estado_pago ?? "pendiente",
        repartidor: fila.repartidor ?? "",
        totalItems: fila.total_items,
      }));

      return { success: true, message: "Pedidos obtenidos", data: pedidos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los pedidos" };
    }
  }

  // cambia el estado de un pedido, validando que pertenezca a la empresa del admin
  public async CambiarEstado(nuevoEstado: string): Promise<{ success: boolean; message: string }> {
    if (!this._idPedido || !this._idEmpresa) return { success: false, message: "Datos incompletos" };

    try {
      const { affectedRows } = await conexion.execute(
        `UPDATE pedidos
         SET id_estado = (SELECT id_estado FROM estados_pedido WHERE nombre_estado = ?)
         WHERE id_pedido = ? AND id_empresa = ?`,
        [nuevoEstado, this._idPedido, this._idEmpresa],
      );

      if (!affectedRows) {
        return { success: false, message: "Pedido no encontrado o sin permisos" };
      }

      return { success: true, message: `Estado actualizado a '${nuevoEstado}'` };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el estado" };
    }
  }

  // detalle completo de un pedido (cabecera + items), validando que pertenezca a la empresa
  public async ObtenerDetalle(): Promise<{
    success: boolean;
    message: string;
    data?: { cabecera: unknown; items: unknown[] };
  }> {
    if (!this._idPedido || !this._idEmpresa) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: cabeceraRows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.total, p.fecha_pedido, p.metodo_pago, p.pago_confirmado, p.observaciones,
           ep.nombre_estado AS estado,
           CONCAT(u.nombre, ' ', u.apellido) AS cliente, u.email AS cliente_email,
           d.direccion_texto AS direccion, d.latitud, d.longitud,
           pg.estado_pago, pg.pasarela, pg.fecha_pago,
           ap.id_proveedor,
           CONCAT(urep.nombre, ' ', urep.apellido) AS repartidor
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
         LEFT JOIN asignacion_pedido ap ON p.id_pedido = ap.id_pedido
         LEFT JOIN usuarios urep ON ap.id_proveedor = urep.id_usuario
         WHERE p.id_pedido = ? AND p.id_empresa = ?`,
        [this._idPedido, this._idEmpresa],
      );

      if (!cabeceraRows || cabeceraRows.length === 0) {
        return { success: false, message: "Pedido no encontrado" };
      }

      const fila = cabeceraRows[0] as DetallePedidoCabeceraRow;

      const cabecera = {
        id: fila.id_pedido,
        total: fila.total,
        fecha: fila.fecha_pedido,
        estado: fila.estado,
        cliente: fila.cliente,
        clienteEmail: fila.cliente_email,
        metodoPago: fila.metodo_pago,
        pagoConfirmado: Boolean(fila.pago_confirmado),
        observaciones: fila.observaciones ?? "",
        direccion: fila.direccion ?? "No disponible",
        latitud: fila.latitud,
        longitud: fila.longitud,
        estadoPago: fila.estado_pago ?? "pendiente",
        repartidor: fila.repartidor ?? "",
      };

      const { rows: itemsRows } = await conexion.execute(
        `SELECT pr.nombre, pr.imagen_url, c.nombre AS categoria,
                dp.cantidad, dp.precio_unitario, dp.cantidad * dp.precio_unitario AS subtotal
         FROM detalle_pedido dp
         INNER JOIN productos pr ON dp.id_producto = pr.id_producto
         INNER JOIN categorias c ON pr.id_categoria = c.id_categoria
         WHERE dp.id_pedido = ?
         ORDER BY pr.nombre`,
        [this._idPedido],
      );

      const items = (itemsRows as DetallePedidoItemRow[]).map((fila) => ({
        nombre: fila.nombre,
        imagenUrl: fila.imagen_url ?? "",
        categoria: fila.categoria,
        cantidad: fila.cantidad,
        precioUnitario: fila.precio_unitario,
        subtotal: fila.subtotal,
      }));

      return { success: true, message: "Detalle obtenido", data: { cabecera, items } };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el detalle del pedido" };
    }
  }
    // asigna un repartidor a un pedido: valida pertenencia, reemplaza asignacion previa,
  // marca el pedido "En preparacion" y notifica a repartidor y cliente — todo en una transaccion
  public async AsignarRepartidor(
    idRepartidor: number,
    notas: string | null,
  ): Promise<{ success: boolean; message: string }> {
    if (!this._idPedido || !this._idEmpresa) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: pedidoValido } = await conexion.execute(
        `SELECT id_pedido FROM pedidos WHERE id_pedido = ? AND id_empresa = ?`,
        [this._idPedido, this._idEmpresa],
      );
      if (!pedidoValido || pedidoValido.length === 0) {
        return { success: false, message: "Pedido no encontrado" };
      }

      await conexion.transaction(async (conn) => {
        await conn.execute(`DELETE FROM asignacion_pedido WHERE id_pedido = ?`, [this._idPedido]);

        await conn.execute(
          `INSERT INTO asignacion_pedido (id_pedido, id_proveedor, notas) VALUES (?, ?, ?)`,
          [this._idPedido, idRepartidor, notas],
        );

        await conn.execute(
          `UPDATE pedidos
           SET id_estado = (SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'En preparacion'),
               fecha_asignacion = NOW()
           WHERE id_pedido = ?`,
          [this._idPedido],
        );

        await conn.execute(
          `INSERT INTO notificaciones (id_usuario, id_pedido, tipo, mensaje, leida)
           VALUES (?, ?, 'pedido_asignado', CONCAT('Se te asignó el pedido #PED-', ?, '. Dirígete a recogerlo.'), 0)`,
          [idRepartidor, this._idPedido, this._idPedido],
        );

        await conn.execute(
          `INSERT INTO notificaciones (id_usuario, id_pedido, tipo, mensaje, leida)
           SELECT p.id_cliente, ?, 'pedido_aprobado',
                  CONCAT('Tu pedido #PED-', ?, ' fue aprobado y tiene repartidor asignado.'), 0
           FROM pedidos p WHERE p.id_pedido = ?`,
          [this._idPedido, this._idPedido, this._idPedido],
        );
      });

      const { rows: nombreRows } = await conexion.execute(
        `SELECT CONCAT(nombre, ' ', apellido) AS nombre_completo FROM usuarios WHERE id_usuario = ?`,
        [idRepartidor],
      );
      const nombreRepartidor = (nombreRows?.[0] as { nombre_completo: string })?.nombre_completo ?? "";

      return { success: true, message: `Pedido asignado a ${nombreRepartidor} correctamente` };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "No fue posible asignar el repartidor",
      };
    }
  }

  // pedidos asignados a un repartidor especifico, dentro de la empresa
  public async ObtenerPorRepartidor(
    idRepartidor: number,
  ): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT p.id_pedido, p.total, p.fecha_pedido, ep.nombre_estado AS estado,
                CONCAT(u.nombre, ' ', u.apellido) AS cliente,
                d.direccion_texto AS direccion, d.latitud, d.longitud
         FROM asignacion_pedido ap
         INNER JOIN pedidos p ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         WHERE ap.id_proveedor = ? AND p.id_empresa = ?
         ORDER BY p.fecha_pedido DESC`,
        [idRepartidor, this._idEmpresa],
      );

      const pedidos = (rows as Record<string, unknown>[]).map((fila) => ({
        id: fila.id_pedido,
        total: fila.total,
        fecha: fila.fecha_pedido,
        estado: fila.estado,
        cliente: fila.cliente,
        direccion: fila.direccion ?? "",
        latitud: fila.latitud,
        longitud: fila.longitud,
      }));

      return { success: true, message: "Pedidos del repartidor obtenidos", data: pedidos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los pedidos del repartidor" };
    }
    
  }
    // metricas del propio repartidor (distinto de ObtenerMetricas, que es por empresa/admin)
  public async ObtenerMetricasRepartidor(
    idRepartidor: number,
  ): Promise<{ success: boolean; message: string; data?: Record<string, number> }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN ep.nombre_estado IN ('En transito', 'En tránsito') THEN 1 ELSE 0 END) AS en_transito,
           SUM(CASE WHEN ep.nombre_estado = 'Entregado' THEN 1 ELSE 0 END) AS entregados,
           SUM(CASE WHEN ep.nombre_estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes
         FROM asignacion_pedido ap
         INNER JOIN pedidos p ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         WHERE ap.id_proveedor = ?`,
        [idRepartidor],
      );

      const fila = rows?.[0] as {
        total: number; en_transito: number | null; entregados: number | null; pendientes: number | null;
      };

      return {
        success: true,
        message: "Métricas obtenidas",
        data: {
          total: fila?.total ?? 0,
          enTransito: fila?.en_transito ?? 0,
          entregados: fila?.entregados ?? 0,
          pendientes: fila?.pendientes ?? 0,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las métricas del repartidor" };
    }
  }

  // listado completo para la vista "Pedidos" del repartidor: incluye empresa, productos y metodo de pago,
  // a diferencia de ObtenerPorRepartidor (que es mas liviano y sirve para el dashboard)
  public async ObtenerDetalladosPorRepartidor(
    idRepartidor: number,
  ): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.total, p.fecha_pedido, p.metodo_pago, p.observaciones,
           ep.nombre_estado AS estado,
           CONCAT(u.nombre, ' ', u.apellido) AS cliente, u.email AS cliente_email,
           d.direccion_texto AS direccion, d.latitud, d.longitud,
           e.nombre AS empresa,
           (SELECT GROUP_CONCAT(pr.nombre SEPARATOR ', ')
            FROM detalle_pedido dp
            INNER JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = p.id_pedido) AS productos,
           (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items
         FROM asignacion_pedido ap
         INNER JOIN pedidos p ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         WHERE ap.id_proveedor = ?
         ORDER BY p.fecha_pedido DESC`,
        [idRepartidor],
      );

      const pedidos = (rows as Record<string, unknown>[]).map((fila) => ({
        id: fila.id_pedido,
        total: fila.total,
        fecha: fila.fecha_pedido,
        estado: fila.estado,
        cliente: fila.cliente,
        clienteEmail: fila.cliente_email,
        direccion: fila.direccion ?? "",
        latitud: fila.latitud,
        longitud: fila.longitud,
        empresa: fila.empresa,
        productos: fila.productos ?? "",
        totalItems: fila.total_items,
        metodoPago: fila.metodo_pago,
        observaciones: fila.observaciones ?? "",
      }));

      return { success: true, message: "Pedidos obtenidos", data: pedidos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los pedidos" };
    }
  }

  // cambia el estado de un pedido validando que pertenezca al repartidor autenticado
  // (distinto de CambiarEstado, que valida pertenencia por id_empresa para el admin)
  public async CambiarEstadoComoRepartidor(
    idRepartidor: number,
    nuevoEstado: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!this._idPedido) return { success: false, message: "Pedido no identificado" };

    try {
      const { rows: asignado } = await conexion.execute(
        `SELECT id_pedido FROM asignacion_pedido WHERE id_pedido = ? AND id_proveedor = ?`,
        [this._idPedido, idRepartidor],
      );
      if (!asignado || asignado.length === 0) {
        return { success: false, message: "No autorizado" };
      }

      const { rows: estados } = await conexion.execute(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = ?`,
        [nuevoEstado],
      );
      if (!estados || estados.length === 0) {
        return { success: false, message: "Estado inválido" };
      }
      const idEstado = (estados[0] as { id_estado: number }).id_estado;

      if (nuevoEstado === "Entregado") {
        await conexion.execute(
          `UPDATE pedidos SET id_estado = ?, fecha_entrega = NOW() WHERE id_pedido = ?`,
          [idEstado, this._idPedido],
        );
      } else {
        await conexion.execute(`UPDATE pedidos SET id_estado = ? WHERE id_pedido = ?`, [idEstado, this._idPedido]);
      }

      return { success: true, message: `Estado actualizado a '${nuevoEstado}'` };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el estado" };
    }
  }
    // metricas del propio cliente (distinto de ObtenerMetricas de Admin y ObtenerMetricasRepartidor)
  public async ObtenerMetricasCliente(
    idCliente: number,
  ): Promise<{ success: boolean; message: string; data?: Record<string, number> }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN ep.nombre_estado IN ('En transito', 'En tránsito') THEN 1 ELSE 0 END) AS en_transito,
           SUM(CASE WHEN ep.nombre_estado = 'Entregado' THEN 1 ELSE 0 END) AS entregados,
           SUM(CASE WHEN ep.nombre_estado = 'Cancelado' THEN 1 ELSE 0 END) AS cancelados,
           SUM(CASE WHEN ep.nombre_estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
           IFNULL(SUM(p.total), 0) AS total_gastado,
           SUM(CASE WHEN MONTH(p.fecha_pedido) = MONTH(CURDATE())
                     AND YEAR(p.fecha_pedido) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS este_mes
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         WHERE p.id_cliente = ?`,
        [idCliente],
      );

      const fila = rows?.[0] as {
        total: number; en_transito: number | null; entregados: number | null;
        cancelados: number | null; pendientes: number | null; total_gastado: number; este_mes: number | null;
      };

      return {
        success: true,
        message: "Métricas obtenidas",
        data: {
          total: fila?.total ?? 0,
          enTransito: fila?.en_transito ?? 0,
          entregados: fila?.entregados ?? 0,
          cancelados: fila?.cancelados ?? 0,
          pendientes: fila?.pendientes ?? 0,
          totalGastado: fila?.total_gastado ?? 0,
          esteMes: fila?.este_mes ?? 0,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las métricas" };
    }
  }

  public async ObtenerPorCliente(
    idCliente: number,
  ): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.total, p.fecha_pedido, p.metodo_pago, p.pago_confirmado,
           ep.nombre_estado AS estado,
           e.nombre AS empresa, e.logo_url AS empresa_logo,
           d.direccion_texto AS direccion,
           (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         WHERE p.id_cliente = ?
         ORDER BY p.fecha_pedido DESC`,
        [idCliente],
      );

      const pedidos = (rows as Record<string, unknown>[]).map((fila) => ({
        id: fila.id_pedido,
        total: fila.total,
        fecha: fila.fecha_pedido,
        estado: fila.estado,
        empresa: fila.empresa,
        empresaLogo: fila.empresa_logo ?? "",
        direccion: fila.direccion ?? "Dirección no disponible",
        metodoPago: fila.metodo_pago,
        pagoConfirmado: Boolean(fila.pago_confirmado),
        totalItems: fila.total_items,
      }));

      return { success: true, message: "Pedidos obtenidos", data: pedidos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los pedidos" };
    }
  }

  // el pedido "en curso" para mostrar como tarjeta destacada en la vista de pedidos
  public async ObtenerPedidoActivoCliente(
    idCliente: number,
  ): Promise<{ success: boolean; message: string; data?: unknown | null }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT
           p.id_pedido, ep.nombre_estado AS estado, e.nombre AS empresa, p.total,
           d.direccion_texto AS direccion,
           (SELECT GROUP_CONCAT(pr.nombre SEPARATOR ', ')
            FROM detalle_pedido dp
            INNER JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE dp.id_pedido = p.id_pedido) AS productos_lista,
           (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         WHERE p.id_cliente = ?
           AND ep.nombre_estado NOT IN ('Entregado', 'Cancelado')
         ORDER BY p.fecha_pedido DESC
         LIMIT 1`,
        [idCliente],
      );

      if (!rows || rows.length === 0) {
        return { success: true, message: "Sin pedido activo", data: null };
      }

      const fila = rows[0] as Record<string, unknown>;

      return {
        success: true,
        message: "Pedido activo obtenido",
        data: {
          id: fila.id_pedido,
          estado: fila.estado,
          empresa: fila.empresa,
          total: fila.total,
          direccion: fila.direccion ?? "Dirección no disponible",
          productosLista: fila.productos_lista ?? "",
          totalItems: fila.total_items,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el pedido activo" };
    }
  }

  // detalle del pedido validando que pertenezca al cliente autenticado
  public async ObtenerDetalleParaCliente(
    idCliente: number,
  ): Promise<{ success: boolean; message: string; data?: { cabecera: unknown; items: unknown[] } }> {
    if (!this._idPedido) return { success: false, message: "Pedido no identificado" };

    try {
      const { rows: pertenece } = await conexion.execute(
        `SELECT id_pedido FROM pedidos WHERE id_pedido = ? AND id_cliente = ?`,
        [this._idPedido, idCliente],
      );
      if (!pertenece || pertenece.length === 0) {
        return { success: false, message: "Pedido no encontrado" };
      }

      const { rows: cabeceraRows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.fecha_pedido, p.total, p.metodo_pago, p.pago_confirmado, p.observaciones,
           ep.nombre_estado AS estado,
           e.nombre AS empresa, e.logo_url AS empresa_logo,
           d.direccion_texto AS direccion, d.latitud, d.longitud,
           pg.estado_pago, pg.pasarela, pg.fecha_pago
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
         WHERE p.id_pedido = ?`,
        [this._idPedido],
      );

      if (!cabeceraRows || cabeceraRows.length === 0) {
        return { success: false, message: "Pedido no encontrado" };
      }

      const fila = cabeceraRows[0] as Record<string, unknown>;

      const cabecera = {
        id: fila.id_pedido,
        fecha: fila.fecha_pedido,
        total: fila.total,
        metodoPago: fila.metodo_pago,
        pagoConfirmado: Boolean(fila.pago_confirmado),
        observaciones: fila.observaciones ?? "",
        estado: fila.estado,
        empresa: fila.empresa,
        empresaLogo: fila.empresa_logo ?? "",
        direccion: fila.direccion ?? "No disponible",
        latitud: fila.latitud,
        longitud: fila.longitud,
        estadoPago: fila.estado_pago ?? "pendiente",
        pasarela: fila.pasarela ?? "",
        fechaPago: fila.fecha_pago ?? "",
      };

      const { rows: itemsRows } = await conexion.execute(
        `SELECT pr.nombre, pr.imagen_url, c.nombre AS categoria,
                dp.cantidad, dp.precio_unitario, dp.cantidad * dp.precio_unitario AS subtotal
         FROM detalle_pedido dp
         INNER JOIN productos pr ON dp.id_producto = pr.id_producto
         INNER JOIN categorias c ON pr.id_categoria = c.id_categoria
         WHERE dp.id_pedido = ?
         ORDER BY pr.nombre`,
        [this._idPedido],
      );

      const items = (itemsRows as Record<string, unknown>[]).map((fila) => ({
        nombre: fila.nombre,
        imagenUrl: fila.imagen_url ?? "",
        categoria: fila.categoria,
        cantidad: fila.cantidad,
        precioUnitario: fila.precio_unitario,
        subtotal: fila.subtotal,
      }));

      return { success: true, message: "Detalle obtenido", data: { cabecera, items } };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener el detalle del pedido" };
    }
    
  }

    // crea el pedido completo: valida stock/precio, inserta pedido+detalle+pago, descuenta inventario,
  // todo en una sola transaccion (igual patron que Pedido.AsignarRepartidor)
  public async CrearPedidoCliente(
  idCliente: number,
  datos: CrearPedidoData,
): Promise<{ success: boolean; message: string; data?: { idPedido: number; total: number } }> {
  try {
    // valida que la direccion pertenezca al cliente autenticado y siga activa,
    // antes de confiar en el idDireccion que viene del body
    const { rows: direccionValida } = await conexion.execute(
      `SELECT id_direccion FROM direcciones WHERE id_direccion = ? AND id_usuario = ? AND activo = 1`,
      [datos.idDireccion, idCliente],
    );
    if (!direccionValida || direccionValida.length === 0) {
      return { success: false, message: "Dirección no válida o no te pertenece" };
    }

    const { rows: _estados } = await conexion.execute(
      `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Pendiente'`,
    );
    const idEstado = (_estados?.[0] as { id_estado: number } | undefined)?.id_estado;
    if (!idEstado) {
      return { success: false, message: "Estado inicial del pedido no configurado" };
    }
    // ... resto del metodo igual

      // el total se calcula desde la base de datos, nunca se confia en precios enviados por el cliente
      let total = 0;
      for (const item of datos.items) {
        const { rows: productos } = await conexion.execute(
          `SELECT precio FROM productos WHERE id_producto = ? AND activo = 1`,
          [item.idProducto],
        );
        if (!productos || productos.length === 0) {
          return { success: false, message: `Producto #${item.idProducto} no encontrado o inactivo` };
        }
        total += (productos[0] as { precio: number }).precio * item.cantidad;
      }
      total += _ENVIO_FIJO;

      const pasarela = datos.metodoPago === "contra_entrega" ? "contra_entrega" : "stripe";
      let idPedido = 0;

      await conexion.transaction(async (conn) => {
        const { lastInsertId } = await conn.execute(
          `INSERT INTO pedidos (id_empresa, id_cliente, id_direccion, id_estado, metodo_pago, total, observaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            datos.idEmpresa, idCliente, datos.idDireccion, idEstado,
            datos.metodoPago ?? "online", total, datos.observaciones ?? null,
          ],
        );
        idPedido = lastInsertId as number;

        for (const item of datos.items) {
          const { rows: productoRows } = await conn.execute(
            `SELECT precio FROM productos WHERE id_producto = ?`,
            [item.idProducto],
          );
          const producto = productoRows?.[0] as { precio: number } | undefined;
          if (!producto) {
            throw new Error(`Producto #${item.idProducto} no encontrado`);
          }
          const precioUnitario = producto.precio;

          await conn.execute(
            `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`,
            [idPedido, item.idProducto, item.cantidad, precioUnitario],
          );

          const { affectedRows } = await conn.execute(
            `UPDATE inventario
             SET stock_disponible = stock_disponible - ?, ultima_actualizacion = NOW()
             WHERE id_producto = ? AND stock_disponible >= ?`,
            [item.cantidad, item.idProducto, item.cantidad],
          );
          if (!affectedRows) {
            throw new Error(`Stock insuficiente para el producto #${item.idProducto}`);
          }
        }

        await conn.execute(
          `INSERT INTO pagos (id_pedido, pasarela, monto, estado_pago) VALUES (?, ?, ?, 'pendiente')`,
          [idPedido, pasarela, total],
        );
      });

      return { success: true, message: "Pedido creado correctamente", data: { idPedido, total } };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "No fue posible crear el pedido",
      };
    }
  }
  
}
