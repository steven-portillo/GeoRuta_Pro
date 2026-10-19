import { conexion } from "../conexion.ts";

export class PedidoProveedor {
  static async Listar(id_proveedor: number) {
    return await conexion.query(
      `SELECT p.id_pedido AS id, p.total, p.fecha_pedido AS fecha,
              ep.nombre_estado AS estado,
              CONCAT(c.nombre, ' ', c.apellido) AS cliente,
              c.email AS clienteEmail, d.direccion_texto AS direccion,
              d.latitud, d.longitud, e.nombre AS empresa,
              (SELECT GROUP_CONCAT(CONCAT(dp.cantidad, ' x ', pr.nombre)
                 ORDER BY pr.nombre SEPARATOR ', ')
               FROM detalle_pedido dp
               INNER JOIN productos pr ON pr.id_producto = dp.id_producto
               WHERE dp.id_pedido = p.id_pedido) AS productos,
              (SELECT COALESCE(SUM(dp.cantidad), 0)
               FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS totalItems,
              p.metodo_pago AS metodoPago, p.observaciones
       FROM asignacion_pedido ap
       INNER JOIN pedidos p ON p.id_pedido = ap.id_pedido
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_usuario
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       WHERE ap.id_proveedor = ?
       ORDER BY p.fecha_pedido DESC`,
      [id_proveedor],
    );
  }

  static async CambiarEstado(
    id_pedido: number,
    id_proveedor: number,
    nuevoEstado: "En transito" | "Entregado",
  ): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT ep.nombre_estado AS estado
         FROM asignacion_pedido ap
         INNER JOIN pedidos p ON p.id_pedido = ap.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         WHERE ap.id_pedido = ? AND ap.id_proveedor = ?
         FOR UPDATE`,
        [id_pedido, id_proveedor],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El pedido no está asignado a este repartidor",
        };
      }

      const estadoActual = String(pedido.estado).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const estadoEsperado = nuevoEstado === "En transito"
        ? ["asignado", "aprobado", "en preparacion"].includes(estadoActual)
        : estadoActual === "en transito";
      if (!estadoEsperado) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El pedido no permite esa transición de estado",
        };
      }

      const estadoDestino = await conexion.query(
        `SELECT id_estado FROM estados_pedido
         WHERE REPLACE(LOWER(nombre_estado), 'á', 'a') = LOWER(?)`,
        [nuevoEstado],
      );
      if (!estadoDestino[0]) {
        throw new Error(`No existe el estado de pedido ${nuevoEstado}`);
      }

      if (nuevoEstado === "Entregado") {
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
              id_proveedor,
              cantidad,
              stockDisponible,
              stockDisponible - cantidad,
              `Entrega del pedido #${id_pedido}`,
            ],
          );
        }
      }

      const fecha = nuevoEstado === "En transito"
        ? "fecha_inicio_transito"
        : "fecha_entrega";
      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, ${fecha} = CURRENT_TIMESTAMP,
           pago_confirmado = IF(
             ? = 'Entregado' AND metodo_pago = 'contra_entrega',
             1, pago_confirmado
           )
         WHERE id_pedido = ?`,
        [estadoDestino[0].id_estado, nuevoEstado, id_pedido],
      );
      if (nuevoEstado === "Entregado") {
        await conexion.execute(
          `UPDATE pagos pg
           INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
           SET pg.estado_pago = 'aprobado', pg.fecha_pago = CURRENT_TIMESTAMP
           WHERE pg.id_pedido = ? AND p.metodo_pago = 'contra_entrega'
             AND pg.estado_pago = 'pendiente'`,
          [id_pedido],
        );
      }
      await conexion.execute("COMMIT");
      return { success: true, message: "Estado del pedido actualizado" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error al cambiar el estado del pedido del repartidor:", error);
      throw error;
    }
  }
}
