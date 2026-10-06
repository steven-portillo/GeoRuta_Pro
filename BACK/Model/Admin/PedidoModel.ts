import { conexion } from "../conexion.ts";

export class Pedido {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT p.id_pedido, p.total, p.metodo_pago, p.pago_confirmado, p.fecha_pedido,
              es.nombre_estado AS estado,
              CONCAT(c.nombre, ' ', c.apellido) AS nombre_cliente,
              d.direccion_texto,
              CONCAT(pr.nombre, ' ', pr.apellido) AS nombre_proveedor
       FROM pedidos p
       INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
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
              d.direccion_texto,
              ap.id_proveedor, pr.nombre AS nombre_proveedor, pr.apellido AS apellido_proveedor
       FROM pedidos p
       INNER JOIN estados_pedido es ON es.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
       LEFT JOIN usuarios pr ON pr.id_usuario = ap.id_proveedor
       WHERE p.id_pedido = ? AND p.id_empresa = ?`,
      [id_pedido, id_empresa],
    );

    if (!pedido) return null;

    const productos = await conexion.query(
      `SELECT dp.id_producto, pd.nombre, dp.cantidad, dp.precio_unitario,
              (dp.cantidad * dp.precio_unitario) AS subtotal
       FROM detalle_pedido dp
       INNER JOIN productos pd ON pd.id_producto = dp.id_producto
       WHERE dp.id_pedido = ?`,
      [id_pedido],
    );

    return { ...pedido, productos };
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
    const codigoEntrega = String(Math.floor(1000 + Math.random() * 9000));

    try {
      await conexion.execute("START TRANSACTION");

      await conexion.execute(
        `INSERT INTO asignacion_pedido (id_pedido, id_proveedor, fecha_asignacion, notas, codigo_entrega)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [id_pedido, id_proveedor, notas ?? null, codigoEntrega],
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

      const observacionesNuevas =
        `${pedido.observaciones ?? ""} | Cancelado: ${motivo}`.trim();
      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, observaciones = ? WHERE id_pedido = ?`,
        [estadoCancelado.id_estado, observacionesNuevas, id_pedido],
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