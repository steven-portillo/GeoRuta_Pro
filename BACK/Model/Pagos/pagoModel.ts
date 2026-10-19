import { conexion } from "../conexion.ts";

export class PagoModel {
  static async ResumenAdmin(id_empresa: number) {
    const pagos = await conexion.query(
      `SELECT pg.id_pago AS id, p.id_pedido AS idPedido,
              CONCAT(u.nombre, ' ', u.apellido) AS cliente,
              pg.pasarela, pg.referencia_ext AS referencia, pg.monto,
              pg.estado_pago AS estadoPago, p.metodo_pago AS metodoPago,
              pg.fecha_pago AS fecha
       FROM pagos pg
       INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
       INNER JOIN usuarios u ON u.id_usuario = p.id_usuario
       WHERE p.id_empresa = ? AND p.metodo_pago = 'online'
       ORDER BY COALESCE(pg.fecha_pago, p.fecha_pedido) DESC
       LIMIT 100`,
      [id_empresa],
    );
    const [metricas] = await conexion.query(
      `SELECT
         COALESCE(SUM(CASE WHEN estado_pago = 'aprobado' THEN monto ELSE 0 END), 0) AS saldoTotal,
         COALESCE(SUM(CASE WHEN estado_pago = 'aprobado'
           AND DATE_FORMAT(fecha_pago, '%Y-%m') = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
           THEN monto ELSE 0 END), 0) AS pagosMes,
         SUM(CASE WHEN estado_pago = 'pendiente' THEN 1 ELSE 0 END) AS pagosPendientes,
         COALESCE(AVG(CASE WHEN estado_pago = 'aprobado' THEN monto END), 0) AS ticketPromedio,
         SUM(CASE WHEN estado_pago = 'aprobado' THEN 1 ELSE 0 END) AS totalAprobados,
         SUM(CASE WHEN estado_pago IN ('rechazado', 'fallido') THEN 1 ELSE 0 END) AS totalRechazados
       FROM pagos pg
       INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
       WHERE p.id_empresa = ? AND p.metodo_pago = 'online'`,
      [id_empresa],
    );
    const serieDiaria = await conexion.query(
      `SELECT DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS fecha,
              SUM(monto) AS total
       FROM pagos pg
       INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
       WHERE p.id_empresa = ? AND p.metodo_pago = 'online'
         AND pg.estado_pago = 'aprobado'
         AND fecha_pago >= CURRENT_DATE - INTERVAL 13 DAY
       GROUP BY DATE(fecha_pago)
       ORDER BY DATE(fecha_pago)`,
      [id_empresa],
    );
    return { pagos, metricas, serieDiaria };
  }

  static async ObtenerDatosCheckout(id_pedido: number, id_cliente: number) {
    const [pago] = await conexion.query(
      `SELECT p.id_pedido, p.total, p.metodo_pago, p.pago_confirmado,
              pg.estado_pago
       FROM pedidos p
       INNER JOIN pagos pg ON pg.id_pedido = p.id_pedido
       WHERE p.id_pedido = ? AND p.id_usuario = ?`,
      [id_pedido, id_cliente],
    );
    return pago ?? null;
  }

  static async GuardarReferencia(
    id_pedido: number,
    id_cliente: number,
    referencia: string,
  ): Promise<boolean> {
    const resultado = await conexion.execute(
      `UPDATE pagos pg
       INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
       SET pg.pasarela = 'wompi', pg.referencia_ext = ?
       WHERE pg.id_pedido = ? AND p.id_usuario = ?
         AND p.metodo_pago = 'online' AND pg.estado_pago = 'pendiente'`,
      [referencia, id_pedido, id_cliente],
    );
    return Number(resultado.affectedRows ?? 0) > 0;
  }

  static async ConfirmarPago(data: {
    id_pedido: number;
    id_cliente: number;
    referencia: string;
    transaccion: string;
    monto: number;
    respuesta: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.execute("START TRANSACTION");
      const [pago] = await conexion.query(
        `SELECT pg.id_pago, pg.monto, pg.estado_pago, pg.referencia_ext,
                p.id_estado, p.pago_confirmado, ep.nombre_estado
         FROM pagos pg
         INNER JOIN pedidos p ON p.id_pedido = pg.id_pedido
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         WHERE pg.id_pedido = ? AND p.id_usuario = ?
           AND p.metodo_pago = 'online'
         FOR UPDATE`,
        [data.id_pedido, data.id_cliente],
      );
      if (!pago) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pago o pedido no encontrado" };
      }
      if (Number(pago.monto) !== data.monto) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "El monto del pago no coincide" };
      }
      if (
        pago.estado_pago === "aprobado" &&
        Number(pago.pago_confirmado) === 1
      ) {
        await conexion.execute("COMMIT");
        return { success: true, message: "El pago ya estaba confirmado" };
      }
      if (pago.referencia_ext !== data.referencia) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "La referencia de pago no coincide" };
      }
      if (pago.nombre_estado !== "Pendiente") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El pedido ya no está pendiente y no puede recibir el pago",
        };
      }

      const [estadoAprobado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Aprobado'`,
      );
      if (!estadoAprobado) {
        throw new Error("No existe el estado de pedido Aprobado");
      }
      await conexion.execute(
        `UPDATE pagos SET referencia_ext = ?, estado_pago = 'aprobado',
           fecha_pago = CURRENT_TIMESTAMP, respuesta_raw = ?
         WHERE id_pago = ?`,
        [data.transaccion, data.respuesta, pago.id_pago],
      );
      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, pago_confirmado = 1,
           fecha_aprobacion = CURRENT_TIMESTAMP
         WHERE id_pedido = ?`,
        [estadoAprobado.id_estado, data.id_pedido],
      );
      await conexion.execute("COMMIT");
      return { success: true, message: "Pago confirmado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error confirmar pago Wompi:", error);
      throw error;
    }
  }

  /** Crea un pedido pendiente y devuelve su id (ajusta columnas a tu esquema) */
  static async crearPedidoPendiente(data: {
    id_usuario: number;
    id_empresa: number;
    total: number;
    referencia: string;
  }): Promise<number> {
    const r = await conexion.execute(
      `INSERT INTO pedidos 
        (id_usuario, id_empresa, id_estado, metodo_pago, total, fecha_pedido, pago_confirmado, observaciones)
       VALUES (?, ?, 1, 'online', ?, NOW(), 0, ?)`,
      [data.id_usuario, data.id_empresa, data.total, data.referencia],
    );
    return r.lastInsertId as number;
  }

  static async registrarPago(data: {
    id_pedido: number;
    referencia_ext: string;
    monto: number;
    estado: string;
    respuesta_raw: string;
  }): Promise<void> {
    await conexion.execute(
      `INSERT INTO pagos 
        (id_pedido, pasarela, referencia_ext, monto, estado_pago, fecha_pago, respuesta_raw)
       VALUES (?, 'wompi', ?, ?, ?, NOW(), ?)`,
      [
        data.id_pedido,
        data.referencia_ext,
        data.monto,
        data.estado,
        data.respuesta_raw,
      ],
    );
  }
}