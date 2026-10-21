import { conexion } from "../conexion.ts";

export interface TransaccionWompi {
  id: string;
  reference: string;
  status: string;
  amount_in_cents: number;
  currency: string;
}

export type ResultadoWebhookWompi =
  | { accion: "ignorado" }
  | { accion: "aprobado"; id_pedido: number }
  | { accion: "rechazado"; id_pedido: number; motivo: string };

export class WompiModel {
  static async ProcesarTransaccion(
    transaccion: TransaccionWompi,
    respuestaRaw: string,
  ): Promise<ResultadoWebhookWompi> {
    await conexion.execute("START TRANSACTION");
    try {
      const [pago] = await conexion.query(
        `SELECT pg.id_pago, pg.id_pedido, pg.monto, pg.estado_pago,
                pg.referencia_ext, pg.referencia_checkout,
                p.id_cliente, p.id_estado, p.metodo_pago, p.pago_confirmado,
                ep.nombre_estado
         FROM pagos pg
         INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         WHERE pg.pasarela = 'wompi' AND pg.referencia_checkout = ?
         FOR UPDATE`,
        [transaccion.reference],
      );
      if (!pago) {
        console.error(
          `Webhook Wompi recibido para referencia desconocida: ${transaccion.reference}`,
        );
        await conexion.execute("COMMIT");
        return { accion: "ignorado" };
      }

      const id_pedido = Number(pago.id_pedido);
      if (
        transaccion.currency !== "COP" ||
        Math.round(Number(pago.monto) * 100) !== transaccion.amount_in_cents
      ) {
        throw new Error(
          `Monto o moneda no coinciden para el pedido #${id_pedido}`,
        );
      }

      if (pago.estado_pago === "aprobado") {
        if (pago.referencia_ext !== transaccion.id) {
          console.error(
            `Wompi notificó una transacción distinta para el pago aprobado del pedido #${id_pedido}`,
          );
        }
        await conexion.execute("COMMIT");
        return { accion: "ignorado" };
      }

      if (
        pago.estado_pago !== "pendiente" ||
        pago.metodo_pago !== "online" ||
        pago.nombre_estado !== "Pendiente"
      ) {
        if (transaccion.status === "APPROVED") {
          console.error(
            `Wompi aprobó el pago del pedido #${id_pedido}, pero el pedido/pago ya no está pendiente; requiere revisión`,
          );
        }
        await conexion.execute("COMMIT");
        return { accion: "ignorado" };
      }

      if (transaccion.status === "APPROVED") {
        const [estadoAprobado] = await conexion.query(
          `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Aprobado'`,
        );
        if (!estadoAprobado) {
          throw new Error("No existe el estado de pedido Aprobado");
        }
        const pagoActualizado = await conexion.execute(
          `UPDATE pagos
           SET referencia_ext = ?, estado_pago = 'aprobado',
               fecha_pago = CURRENT_TIMESTAMP, respuesta_raw = ?
           WHERE id_pago = ? AND estado_pago = 'pendiente'`,
          [transaccion.id, respuestaRaw, pago.id_pago],
        );
        if (Number(pagoActualizado.affectedRows ?? 0) !== 1) {
          throw new Error(
            `No se pudo confirmar el pago del pedido #${id_pedido}`,
          );
        }
        const pedidoActualizado = await conexion.execute(
          `UPDATE pedidos
           SET id_estado = ?, pago_confirmado = 1,
               fecha_aprobacion = CURRENT_TIMESTAMP
           WHERE id_pedido = ? AND id_estado = ? AND pago_confirmado = 0`,
          [estadoAprobado.id_estado, id_pedido, pago.id_estado],
        );
        if (Number(pedidoActualizado.affectedRows ?? 0) !== 1) {
          throw new Error(`No se pudo aprobar el pedido #${id_pedido}`);
        }
        await conexion.execute(
          `INSERT INTO notificaciones
             (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
           VALUES (?, ?, 'pago_aprobado', ?, 0, CURRENT_TIMESTAMP)`,
          [
            pago.id_cliente,
            id_pedido,
            `El pago del pedido #${id_pedido} fue aprobado.`,
          ],
        );
        await conexion.execute("COMMIT");
        return { accion: "aprobado", id_pedido };
      }

      if (
        transaccion.status === "DECLINED" ||
        transaccion.status === "VOIDED" ||
        transaccion.status === "ERROR"
      ) {
        const [estadoCancelado] = await conexion.query(
          `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Cancelado'`,
        );
        if (!estadoCancelado) {
          throw new Error("No existe el estado de pedido Cancelado");
        }
        const items = await conexion.query(
          `SELECT id_producto, cantidad
           FROM detalle_pedido WHERE id_pedido = ?
           ORDER BY id_producto FOR UPDATE`,
          [id_pedido],
        );
        for (const item of items) {
          const [inventario] = await conexion.query(
            `SELECT stock_reservado FROM inventario
             WHERE id_producto = ? FOR UPDATE`,
            [item.id_producto],
          );
          const cantidad = Number(item.cantidad);
          if (!inventario || Number(inventario.stock_reservado) < cantidad) {
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
              pago.id_cliente,
              cantidad,
              reservadoAnterior,
              reservadoNuevo,
              `Liberación por pago Wompi no aprobado del pedido #${id_pedido}`,
            ],
          );
        }

        const estadoPago = transaccion.status === "VOIDED"
          ? "cancelado"
          : "rechazado";
        await conexion.execute(
          `UPDATE pagos
           SET referencia_ext = ?, estado_pago = ?, respuesta_raw = ?
           WHERE id_pago = ? AND estado_pago = 'pendiente'`,
          [transaccion.id, estadoPago, respuestaRaw, pago.id_pago],
        );
        const pedidoActualizado = await conexion.execute(
          `UPDATE pedidos SET id_estado = ?, pago_confirmado = 0
           WHERE id_pedido = ? AND id_estado = ? AND pago_confirmado = 0`,
          [estadoCancelado.id_estado, id_pedido, pago.id_estado],
        );
        if (Number(pedidoActualizado.affectedRows ?? 0) !== 1) {
          throw new Error(`No se pudo cancelar el pedido #${id_pedido}`);
        }
        await conexion.execute(
          `INSERT INTO notificaciones
             (id_usuario, id_pedido, tipo, mensaje, leida, fecha_hora)
           VALUES (?, ?, 'pago_rechazado', ?, 0, CURRENT_TIMESTAMP)`,
          [
            pago.id_cliente,
            id_pedido,
            `El pago del pedido #${id_pedido} no fue aprobado y el pedido fue cancelado.`,
          ],
        );
        await conexion.execute("COMMIT");
        return {
          accion: "rechazado",
          id_pedido,
          motivo: `El pago en Wompi terminó con estado ${transaccion.status}.`,
        };
      }

      await conexion.execute("COMMIT");
      return { accion: "ignorado" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error procesando evento de pago Wompi:", error);
      throw error;
    }
  }
}
