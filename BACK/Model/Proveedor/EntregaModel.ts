import { conexion } from "../conexion.ts";

const MAX_INTENTOS_CODIGO = 5;
const MAX_REEMISIONES_CODIGO = 3;

function generarCodigoEntrega(codigosUsados: Set<string>): string {
  const rango = 9000;
  const limite = Math.floor(0x1_0000_0000 / rango) * rango;
  const valorAleatorio = new Uint32Array(1);
  let codigo: string;
  do {
    crypto.getRandomValues(valorAleatorio);
    if (valorAleatorio[0] >= limite) continue;
    codigo = String(1000 + (valorAleatorio[0] % rango));
  } while (codigosUsados.has(codigo!));
  codigosUsados.add(codigo!);
  return codigo!;
}

export class EntregaProveedor {
  static async IniciarEntregas(id_proveedor: number) {
    try {
      await conexion.execute("START TRANSACTION");
      const [estadoAsignado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Asignado'`,
      );
      const [estadoTransito] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'En transito'`,
      );
      if (!estadoAsignado || !estadoTransito) {
        throw new Error(
          "Falta el estado Asignado o En transito en la base de datos",
        );
      }

      const pedidos = await conexion.query(
        `SELECT p.id_pedido
         FROM pedidos p
         INNER JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
         WHERE ap.id_proveedor = ? AND p.id_estado = ?
         ORDER BY p.id_pedido
         FOR UPDATE`,
        [id_proveedor, estadoAsignado.id_estado],
      );
      if (pedidos.length === 0) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "No tienes pedidos asignados pendientes para iniciar",
        };
      }

      const codigos = new Set<string>();
      const id_pedidos: number[] = [];
      for (const pedido of pedidos) {
        const id_pedido = Number(pedido.id_pedido);
        const codigo = generarCodigoEntrega(codigos);
        const result = await conexion.execute(
          `UPDATE asignacion_pedido
           SET codigo_entrega = ?, intentos_codigo_entrega = 0,
               codigo_entrega_bloqueado = 0, reemisiones_codigo_entrega = 0
           WHERE id_pedido = ? AND id_proveedor = ?`,
          [codigo, id_pedido, id_proveedor],
        );
        if (Number(result.affectedRows ?? 0) !== 1) {
          throw new Error(
            `No se pudo guardar el código de entrega para el pedido #${id_pedido}`,
          );
        }
        const estadoResult = await conexion.execute(
          `UPDATE pedidos
           SET id_estado = ?, fecha_inicio_transito = CURRENT_TIMESTAMP
           WHERE id_pedido = ? AND id_estado = ?`,
          [estadoTransito.id_estado, id_pedido, estadoAsignado.id_estado],
        );
        if (Number(estadoResult.affectedRows ?? 0) !== 1) {
          throw new Error(
            `No se pudo iniciar la entrega para el pedido #${id_pedido}`,
          );
        }
        await conexion.execute(
          `INSERT INTO notificaciones
             (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
           SELECT p.id_cliente, p.id_pedido, 'en_transito',
                  CONCAT('Tu pedido #', p.id_pedido, ' está en camino.'),
                  0, CURRENT_TIMESTAMP
           FROM pedidos p
           WHERE p.id_pedido = ?`,
          [id_pedido],
        );
        id_pedidos.push(id_pedido);
      }

      await conexion.execute("COMMIT");
      return {
        success: true,
        message: `Se iniciaron ${id_pedidos.length} entrega(s)`,
        iniciadas: id_pedidos.length,
        id_pedidos,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error IniciarEntregas proveedor:", error);
      throw error;
    }
  }

  static async ConfirmarEntrega(
    id_proveedor: number,
    id_pedido: number,
    codigo_entrega: string,
    pago_recibido?: boolean,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT p.id_pedido, p.id_estado, p.metodo_pago, p.pago_confirmado,
                pg.estado_pago, ap.codigo_entrega,
                ap.intentos_codigo_entrega, ap.codigo_entrega_bloqueado,
                ep.nombre_estado AS estado
         FROM pedidos p
         INNER JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
         WHERE p.id_pedido = ? AND ap.id_proveedor = ?
         FOR UPDATE`,
        [id_pedido, id_proveedor],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pedido no encontrado" };
      }
      if (pedido.estado !== "En transito") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Solo puedes confirmar pedidos que estén En transito",
        };
      }
      if (
        pedido.metodo_pago === "online" &&
        (Number(pedido.pago_confirmado) !== 1 ||
          pedido.estado_pago !== "aprobado")
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "No se puede confirmar la entrega hasta que la pasarela confirme el pago.",
        };
      }
      if (Number(pedido.codigo_entrega_bloqueado) === 1) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "El código está bloqueado. Solicita uno nuevo para continuar.",
        };
      }
      if (
        typeof pedido.codigo_entrega !== "string" ||
        pedido.codigo_entrega !== codigo_entrega
      ) {
        const intentos = Number(pedido.intentos_codigo_entrega) + 1;
        await conexion.execute(
          `UPDATE asignacion_pedido
           SET intentos_codigo_entrega = ?,
               codigo_entrega_bloqueado = ?
           WHERE id_pedido = ? AND id_proveedor = ?`,
          [
            intentos,
            intentos >= MAX_INTENTOS_CODIGO ? 1 : 0,
            id_pedido,
            id_proveedor,
          ],
        );
        await conexion.execute("COMMIT");
        return {
          success: false,
          message: intentos >= MAX_INTENTOS_CODIGO
            ? "Se agotaron los intentos. El código quedó bloqueado; solicita uno nuevo."
            : `Código incorrecto. Te quedan ${
              MAX_INTENTOS_CODIGO - intentos
            } intento(s).`,
          intentos_restantes: Math.max(0, MAX_INTENTOS_CODIGO - intentos),
        };
      }
      if (
        pedido.metodo_pago === "contra_entrega" &&
        pago_recibido !== true
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "No se puede confirmar una entrega contraentrega sin recibir el pago. Cancela el pedido e indica el motivo.",
        };
      }
      if (pedido.metodo_pago === "online" && pago_recibido !== undefined) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "La confirmación del pago online corresponde a la pasarela, no al proveedor.",
        };
      }

      const [estadoEntregado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Entregado'`,
      );
      if (!estadoEntregado) {
        throw new Error("No existe el estado de pedido Entregado");
      }
      const items = await conexion.query(
        `SELECT id_producto, cantidad FROM detalle_pedido
         WHERE id_pedido = ? ORDER BY id_producto FOR UPDATE`,
        [id_pedido],
      );
      if (items.length === 0) {
        throw new Error(`El pedido #${id_pedido} no tiene productos`);
      }

      for (const item of items) {
        const [inventario] = await conexion.query(
          `SELECT stock_disponible, stock_reservado
           FROM inventario WHERE id_producto = ? FOR UPDATE`,
          [item.id_producto],
        );
        const cantidad = Number(item.cantidad);
        if (
          !inventario ||
          Number(inventario.stock_disponible) < cantidad ||
          Number(inventario.stock_reservado) < cantidad
        ) {
          throw new Error(
            `El inventario reservado del producto ${item.id_producto} es inconsistente`,
          );
        }
        const stockAnterior = Number(inventario.stock_disponible);
        await conexion.execute(
          `UPDATE inventario
           SET stock_disponible = stock_disponible - ?,
               stock_reservado = stock_reservado - ?,
               ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [cantidad, cantidad, item.id_producto],
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
            stockAnterior,
            stockAnterior - cantidad,
            `Entrega confirmada pedido #${id_pedido}`,
          ],
        );
      }

      const estadoResult = await conexion.execute(
        `UPDATE pedidos
         SET id_estado = ?, fecha_entrega = CURRENT_TIMESTAMP,
             pago_confirmado = CASE
               WHEN metodo_pago = 'contra_entrega' THEN ?
               ELSE pago_confirmado
             END
         WHERE id_pedido = ? AND id_estado = ?`,
        [
          estadoEntregado.id_estado,
          pago_recibido ? 1 : 0,
          id_pedido,
          pedido.id_estado,
        ],
      );
      if (Number(estadoResult.affectedRows ?? 0) !== 1) {
        throw new Error(
          `No se pudo actualizar el estado del pedido #${id_pedido}`,
        );
      }

      if (pedido.metodo_pago === "contra_entrega" && pago_recibido) {
        await conexion.execute(
          `UPDATE pagos
           SET estado_pago = 'aprobado', fecha_pago = CURRENT_TIMESTAMP
           WHERE id_pedido = ?`,
          [id_pedido],
        );
      }

      await conexion.execute(
        `INSERT INTO notificaciones
           (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
         SELECT p.id_cliente, p.id_pedido, 'entregado',
                CONCAT('Tu pedido #', p.id_pedido, ' fue entregado exitosamente.'),
                0, CURRENT_TIMESTAMP
         FROM pedidos p
         WHERE p.id_pedido = ?`,
        [id_pedido],
      );
      await conexion.execute(
        `INSERT INTO notificaciones
           (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
         SELECT u.id_usuario, p.id_pedido, 'entregado',
                CONCAT('El pedido #', p.id_pedido, ' fue entregado exitosamente.'),
                0, CURRENT_TIMESTAMP
         FROM pedidos p
         INNER JOIN usuarios u ON u.id_empresa = p.id_empresa
           AND u.id_rol = 2 AND u.activo = 1
         WHERE p.id_pedido = ?`,
        [id_pedido],
      );

      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Entrega confirmada correctamente",
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error ConfirmarEntrega proveedor:", error);
      throw error;
    }
  }

  static async ReemitirCodigoEntrega(
    id_proveedor: number,
    id_pedido: number,
  ): Promise<
    | { success: false; message: string }
    | {
      success: true;
      message: string;
      id_pedido: number;
      nombre_cliente: string;
      email: string;
      codigo: string;
    }
  > {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT p.id_pedido, ep.nombre_estado AS estado,
                ap.codigo_entrega_bloqueado,
                ap.reemisiones_codigo_entrega,
                c.nombre AS nombre_cliente, c.email
         FROM pedidos p
         INNER JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
         WHERE p.id_pedido = ? AND ap.id_proveedor = ?
         FOR UPDATE`,
        [id_pedido, id_proveedor],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pedido no encontrado" };
      }
      if (pedido.estado !== "En transito") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "Solo puedes solicitar un código para una entrega en tránsito",
        };
      }
      if (Number(pedido.codigo_entrega_bloqueado) !== 1) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El código actual aún no está bloqueado",
        };
      }
      if (
        Number(pedido.reemisiones_codigo_entrega) >=
          MAX_REEMISIONES_CODIGO
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "Se alcanzó el límite de códigos nuevos. Contacta al administrador.",
        };
      }

      const codigo = generarCodigoEntrega(new Set());
      const actualizado = await conexion.execute(
        `UPDATE asignacion_pedido
         SET codigo_entrega = ?, intentos_codigo_entrega = 0,
             codigo_entrega_bloqueado = 0,
             reemisiones_codigo_entrega = reemisiones_codigo_entrega + 1
         WHERE id_pedido = ? AND id_proveedor = ?`,
        [codigo, id_pedido, id_proveedor],
      );
      if (Number(actualizado.affectedRows ?? 0) !== 1) {
        throw new Error(
          `No se pudo actualizar el código del pedido #${id_pedido}`,
        );
      }
      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Se generó un nuevo código para el cliente",
        id_pedido: Number(pedido.id_pedido),
        nombre_cliente: pedido.nombre_cliente,
        email: pedido.email,
        codigo,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error ReemitirCodigoEntrega proveedor:", error);
      throw error;
    }
  }

  static async CancelarEntrega(
    id_proveedor: number,
    id_pedido: number,
    motivo: string,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT p.id_estado, p.metodo_pago, p.pago_confirmado,
                ep.nombre_estado AS estado, pg.estado_pago
         FROM pedidos p
         INNER JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
         WHERE p.id_pedido = ? AND ap.id_proveedor = ?
         FOR UPDATE`,
        [id_pedido, id_proveedor],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pedido no encontrado" };
      }
      if (pedido.estado !== "En transito") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Solo puedes cancelar pedidos que estén En transito",
        };
      }
      if (
        pedido.metodo_pago === "online" &&
        (Number(pedido.pago_confirmado) === 1 ||
          pedido.estado_pago === "aprobado")
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "El pago online ya fue aprobado. El pedido requiere revisión administrativa y gestión manual del reembolso.",
        };
      }
      if (
        pedido.metodo_pago === "online" &&
        pedido.estado_pago === "pendiente"
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "El pago online sigue pendiente. Espera el resultado de la pasarela antes de cancelar.",
        };
      }

      const [estadoCancelado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Cancelado'`,
      );
      if (!estadoCancelado) {
        throw new Error("No existe el estado de pedido Cancelado");
      }
      const items = await conexion.query(
        `SELECT id_producto, cantidad FROM detalle_pedido
         WHERE id_pedido = ? ORDER BY id_producto FOR UPDATE`,
        [id_pedido],
      );
      if (items.length === 0) {
        throw new Error(`El pedido #${id_pedido} no tiene productos`);
      }

      const pedidoActualizado = await conexion.execute(
        `UPDATE pedidos
         SET id_estado = ?, motivo_cancelacion = ?,
             fecha_cancelacion = CURRENT_TIMESTAMP, cancelado_por = ?
         WHERE id_pedido = ? AND id_estado = ?`,
        [
          estadoCancelado.id_estado,
          motivo,
          id_proveedor,
          id_pedido,
          pedido.id_estado,
        ],
      );
      if (Number(pedidoActualizado.affectedRows ?? 0) !== 1) {
        throw new Error(`No se pudo cancelar el pedido #${id_pedido}`);
      }
      await conexion.execute(
        `UPDATE pagos SET estado_pago = 'cancelado'
         WHERE id_pedido = ? AND estado_pago = 'pendiente'`,
        [id_pedido],
      );

      for (const item of items) {
        const [inventario] = await conexion.query(
          `SELECT stock_reservado FROM inventario
           WHERE id_producto = ? FOR UPDATE`,
          [item.id_producto],
        );
        const cantidad = Number(item.cantidad);
        if (
          !inventario || Number(inventario.stock_reservado) < cantidad
        ) {
          throw new Error(
            `La reserva del producto ${item.id_producto} es inconsistente para el pedido #${id_pedido}`,
          );
        }
        const reservadoAnterior = Number(inventario.stock_reservado);
        const reservadoNuevo = reservadoAnterior - cantidad;
        await conexion.execute(
          `UPDATE inventario SET stock_reservado = ?,
             ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [reservadoNuevo, item.id_producto],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
             (id_producto, id_usuario, tipo_movimiento, cantidad,
              stock_anterior, stock_nuevo, motivo, fecha)
           VALUES (?, ?, 'liberacion', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.id_producto,
            id_proveedor,
            cantidad,
            reservadoAnterior,
            reservadoNuevo,
            `Liberación por cancelación del proveedor del pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute(
        `INSERT INTO notificaciones
           (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
         SELECT p.id_cliente, p.id_pedido, 'cancelado',
                CONCAT('Tu pedido #', p.id_pedido, ' fue cancelado por el proveedor.'),
                0, CURRENT_TIMESTAMP
         FROM pedidos p
         WHERE p.id_pedido = ?`,
        [id_pedido],
      );
      await conexion.execute(
        `INSERT INTO notificaciones
           (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
         SELECT u.id_usuario, p.id_pedido, 'cancelado',
                CONCAT('El pedido #', p.id_pedido, ' fue cancelado por el proveedor.'),
                0, CURRENT_TIMESTAMP
         FROM pedidos p
         INNER JOIN usuarios u ON u.id_empresa = p.id_empresa
           AND u.id_rol = 2 AND u.activo = 1
         WHERE p.id_pedido = ?`,
        [id_pedido],
      );

      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Pedido cancelado correctamente",
        id_pedido,
        motivo,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error CancelarEntrega proveedor:", error);
      throw error;
    }
  }
}
