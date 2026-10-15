import { conexion } from "../conexion.ts";

export class PagoModel {
  
  static async crearPedidoPendiente(data: {
    id_empresa: number;
    id_usuario: number;
    id_direccion: number;
    total: number;
    reference: string;
  }): Promise<number> {
    const r = await conexion.execute(
      `INSERT INTO pedidos
        (id_empresa, id_usuario, id_direccion, id_estado, metodo_pago, total, fecha_pedido, pago_confirmado, observaciones)
       VALUES (?, ?, ?, 1, 'online', ?, NOW(), 0, ?)`,
      [
        data.id_empresa,
        data.id_usuario,
        data.id_direccion,
        data.total,
        data.reference,
      ],
    );
    return r.lastInsertId as number;
  }

  static async crearDetallePedido(data: {
    id_pedido: number;
    id_producto: number;
    cantidad: number;
    precio_unitario: number;
  }): Promise<void> {
    await conexion.execute(
      `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [data.id_pedido, data.id_producto, data.cantidad, data.precio_unitario],
    );
  }

  static async confirmarPorReferencia(data: {
    reference: string;
    referencia_ext: string;
    monto: number;
    respuesta_raw: string;
  }): Promise<boolean> {
    const [pedido] = await conexion.query(
      `SELECT id_pedido, pago_confirmado FROM pedidos WHERE observaciones = ? LIMIT 1`,
      [data.reference],
    );

    if (!pedido) {
      console.log("Pedido no encontrado, reference:", data.reference);
      return false;
    }

    // Evitar duplicar si el webhook llega 2 veces
    if (pedido.pago_confirmado === 1) {
      console.log("Pedido ya confirmado:", pedido.id_pedido);
      return true;
    }

    await conexion.execute(
      `UPDATE pedidos
       SET pago_confirmado = 1,
           id_estado = 2,
           fecha_aprobacion = NOW()
       WHERE id_pedido = ?`,
      [pedido.id_pedido],
    );

    await conexion.execute(
      `INSERT INTO pagos
        (id_pedido, pasarela, referencia_ext, monto, estado_pago, fecha_pago, respuesta_raw)
       VALUES (?, 'wompi', ?, ?, 'aprobado', NOW(), ?)`,
      [
        pedido.id_pedido,
        data.referencia_ext,
        data.monto,
        data.respuesta_raw,
      ],
    );

    return true;
  }
}