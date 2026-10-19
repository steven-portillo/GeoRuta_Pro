import { conexion } from "../conexion.ts";

export class Pedido {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT p.id_pedido AS id, p.total, p.metodo_pago AS metodoPago,
              p.pago_confirmado AS pagoConfirmado, p.fecha_pedido AS fecha,
              es.nombre_estado AS estado,
              CONCAT(c.nombre, ' ', c.apellido) AS cliente,
              d.direccion_texto AS direccion,
              CONCAT(pr.nombre, ' ', pr.apellido) AS repartidor,
              pg.estado_pago AS estadoPago,
              (SELECT COALESCE(SUM(dp.cantidad), 0)
               FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS totalItems
       FROM pedidos p
       INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_usuario
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
       LEFT JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
       LEFT JOIN usuarios pr ON pr.id_usuario = ap.id_proveedor
       WHERE p.id_empresa = ?
       ORDER BY p.fecha_pedido DESC`,
      [id_empresa],
    );
  }

  static async ObtenerDetalle(id_pedido: number, id_empresa: number) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, p.total, p.metodo_pago, p.pago_confirmado, p.observaciones,
              p.fecha_pedido, p.fecha_aprobacion, p.fecha_asignacion, p.fecha_inicio_transito, p.fecha_entrega,
              es.nombre_estado AS estado,
              c.id_usuario AS id_cliente, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente, c.email AS email_cliente,
              d.direccion_texto, d.latitud, d.longitud,
              ap.id_proveedor, pr.nombre AS nombre_proveedor, pr.apellido AS apellido_proveedor,
              pg.estado_pago
       FROM pedidos p
       INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_usuario
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
       LEFT JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
       LEFT JOIN usuarios pr ON pr.id_usuario = ap.id_proveedor
       WHERE p.id_pedido = ? AND p.id_empresa = ?`,
      [id_pedido, id_empresa],
    );

    if (!pedido) return null;

    const productos = await conexion.query(
      `SELECT dp.id_producto, pd.nombre, dp.cantidad, dp.precio_unitario,
              (dp.cantidad * dp.precio_unitario) AS subtotal,
              c.nombre AS categoria,
              (SELECT pi.url FROM producto_imagenes pi
               WHERE pi.id_producto = pd.id_producto
               ORDER BY pi.orden ASC LIMIT 1) AS imagenUrl
       FROM detalle_pedido dp
       INNER JOIN productos pd ON pd.id_producto = dp.id_producto
       INNER JOIN categorias c ON c.id_categoria = pd.id_categoria
       WHERE dp.id_pedido = ?`,
      [id_pedido],
    );

    return { ...pedido, productos };
  }

  static async Aprobar(id_pedido: number, id_empresa: number) {
    const [estadoAprobado] = await conexion.query(
      `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Aprobado'`,
    );
    if (!estadoAprobado) {
      throw new Error("No existe el estado de pedido Aprobado");
    }

    const result = await conexion.execute(
      `UPDATE pedidos SET id_estado = ?, fecha_aprobacion = CURRENT_TIMESTAMP
       WHERE id_pedido = ? AND id_empresa = ?
         AND id_estado = (
           SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Pendiente'
         )`,
      [estadoAprobado.id_estado, id_pedido, id_empresa],
    );
    if (Number(result.affectedRows ?? 0) === 0) {
      const [pedido] = await conexion.query(
        `SELECT id_pedido FROM pedidos WHERE id_pedido = ? AND id_empresa = ?`,
        [id_pedido, id_empresa],
      );
      return pedido
        ? { success: false, message: "El pedido ya no está pendiente" }
        : { success: false, message: "Pedido no encontrado" };
    }
    return { success: true, message: "Pedido aprobado correctamente" };
  }

  static async Entregar(
    id_pedido: number,
    id_empresa: number,
    id_usuario: number,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT ep.nombre_estado AS estado
         FROM pedidos p
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         WHERE p.id_pedido = ? AND p.id_empresa = ?
         FOR UPDATE`,
        [id_pedido, id_empresa],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pedido no encontrado" };
      }
      const estadoActual = String(pedido.estado).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (estadoActual !== "en transito") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Solo se puede marcar como entregado un pedido en tránsito",
        };
      }

      const [estadoEntregado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido
         WHERE LOWER(nombre_estado) = 'entregado'`,
      );
      if (!estadoEntregado) {
        throw new Error("No existe el estado de pedido Entregado");
      }
      const items = await conexion.query(
        `SELECT dp.id_producto, dp.cantidad,
                i.stock_disponible, i.stock_reservado
         FROM detalle_pedido dp
         INNER JOIN inventario i ON i.id_producto = dp.id_producto
         WHERE dp.id_pedido = ?
         ORDER BY dp.id_producto
         FOR UPDATE`,
        [id_pedido],
      );
      for (const item of items) {
        const cantidad = Number(item.cantidad);
        const stockDisponible = Number(item.stock_disponible);
        const stockReservado = Number(item.stock_reservado);
        if (stockDisponible < cantidad || stockReservado < cantidad) {
          throw new Error(
            `Inventario reservado inconsistente para el producto ${item.id_producto}`,
          );
        }
        await conexion.execute(
          `UPDATE inventario
           SET stock_disponible = ?, stock_reservado = ?,
               ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [
            stockDisponible - cantidad,
            stockReservado - cantidad,
            item.id_producto,
          ],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
             (id_producto, id_usuario, tipo_movimiento, cantidad,
              stock_anterior, stock_nuevo, motivo, fecha)
           VALUES (?, ?, 'salida', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.id_producto,
            id_usuario,
            cantidad,
            stockDisponible,
            stockDisponible - cantidad,
            `Entrega del pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, fecha_entrega = CURRENT_TIMESTAMP,
           pago_confirmado = IF(metodo_pago = 'contra_entrega', 1, pago_confirmado)
         WHERE id_pedido = ? AND id_empresa = ?`,
        [estadoEntregado.id_estado, id_pedido, id_empresa],
      );
      await conexion.execute(
        `UPDATE pagos pg
         INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
         SET pg.estado_pago = 'aprobado', pg.fecha_pago = CURRENT_TIMESTAMP
         WHERE pg.id_pedido = ? AND p.metodo_pago = 'contra_entrega'
           AND pg.estado_pago = 'pendiente'`,
        [id_pedido],
      );
      await conexion.execute("COMMIT");
      return { success: true, message: "Pedido marcado como entregado" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error al completar entrega del pedido:", error);
      throw error;
    }
  }

  static async AsignarProveedor(
    id_pedido: number,
    id_empresa: number,
    id_proveedor: number,
    notas?: string,
  ) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, es.nombre_estado,
            (SELECT COUNT(*) FROM asignacion_pedido WHERE id_pedido = p.id_pedido) AS yaAsignado
     FROM pedidos p INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
     WHERE p.id_pedido = ? AND p.id_empresa = ?`,
      [id_pedido, id_empresa],
    );
    if (!pedido) {
      return { success: false, message: "Pedido no encontrado" };
    }
    if (pedido.nombre_estado !== "Aprobado") {
      return {
        success: false,
        message: "Solo se puede asignar proveedor a un pedido Aprobado",
      };
    }
    if (pedido.yaAsignado > 0) {
      return {
        success: false,
        message: "Este pedido ya tiene un proveedor asignado",
      };
    }

    const [proveedor] = await conexion.query(
      `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND id_empresa = ? AND id_rol = 3 AND activo = 1`,
      [id_proveedor, id_empresa],
    );
    if (!proveedor) {
      return { success: false, message: "Proveedor inválido o inactivo" };
    }

    const [estadoAsignado] = await conexion.query(
      `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Asignado'`,
    );
    try {
      await conexion.execute("START TRANSACTION");

      await conexion.execute(
        `INSERT INTO asignacion_pedido (id_pedido, id_proveedor, fecha_asignacion, notas)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
        [id_pedido, id_proveedor, notas ?? null],
      );

      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, fecha_asignacion = CURRENT_TIMESTAMP WHERE id_pedido = ?`,
        [estadoAsignado.id_estado, id_pedido],
      );

      await conexion.execute("COMMIT");
      return { success: true, message: "Proveedor asignado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error AsignarProveedor:", error);
      return { success: false, message: "Error al asignar el proveedor" };
    }
  }

  static async Cancelar(
    id_pedido: number,
    id_empresa: number,
    id_usuario: number,
    motivo: string,
  ) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, es.nombre_estado, p.observaciones
     FROM pedidos p INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
     WHERE p.id_pedido = ? AND p.id_empresa = ?`,
      [id_pedido, id_empresa],
    );
    if (!pedido) {
      return { success: false, message: "Pedido no encontrado" };
    }
    if (
      pedido.nombre_estado === "Entregado" ||
      pedido.nombre_estado === "Cancelado"
    ) {
      return {
        success: false,
        message: "No se puede cancelar un pedido entregado o ya cancelado",
      };
    }

    const [estadoCancelado] = await conexion.query(
      `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Cancelado'`,
    );

    const items = await conexion.query(
      `SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?`,
      [id_pedido],
    );

    try {
      await conexion.execute("START TRANSACTION");

      const observacionesNuevas = `${
        pedido.observaciones ?? ""
      } | Cancelado: ${motivo}`.trim();
      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, observaciones = ? WHERE id_pedido = ?`,
        [estadoCancelado.id_estado, observacionesNuevas, id_pedido],
      );

      await conexion.execute(
        `UPDATE pagos SET estado_pago = 'cancelado' WHERE id_pedido = ?`,
        [id_pedido],
      );

      for (const item of items) {
        const [inventario] = await conexion.query(
          `SELECT stock_reservado FROM inventario WHERE id_producto = ? FOR UPDATE`,
          [item.id_producto],
        );
        const reservadoAnterior = inventario.stock_reservado;
        const reservadoNuevo = reservadoAnterior - item.cantidad;

        await conexion.execute(
          `UPDATE inventario SET stock_reservado = ?, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ?`,
          [reservadoNuevo, item.id_producto],
        );

        await conexion.execute(
          `INSERT INTO movimientos_inventario
          (id_producto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
         VALUES (?, ?, 'liberacion', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.id_producto,
            id_usuario,
            item.cantidad,
            reservadoAnterior,
            reservadoNuevo,
            `Liberación por cancelación pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute("COMMIT");
      return { success: true, message: "Pedido cancelado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Cancelar pedido:", error);
      return { success: false, message: "Error al cancelar el pedido" };
    }
  }
}
