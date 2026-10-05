import { conexion } from "./conexion.ts";

interface datosPedido {
  id_empresa: number;
  id_usuario: number;
  id_direccion: number | null;
  total: number;
}

export class pedidoModel {
  public _objPedido: datosPedido | null;
  public _id_pedido: number | null;

  constructor(
    objPedido: datosPedido | null = null,
    id_pedido: number | null = null,
  ) {
    this._objPedido = objPedido;
    this._id_pedido = id_pedido;
  }


/**
 * CREARPEDIDO
 * inserta los datos del pedido, dejando como predeterminado:
 * id_estado = 1 -> pendiente
 * metodo_pago = online -> Pago con stripe
 * fecha_pedido = NOW() -> Feha actual
 * pago_confirmado = 0 -> False
 * 
 */

  public async crearPedido(): Promise<number> {
    const r = await conexion.execute(
      `INSERT INTO pedidos 
        (id_empresa, id_usuario, id_direccion, id_estado, metodo_pago, total, fecha_pedido, pago_confirmado)
       VALUES (?, ?, ?, 1, 'online', ?, NOW(), 0)`,
      [
        this._objPedido?.id_empresa,
        this._objPedido?.id_usuario,
        this._objPedido?.id_direccion,
        this._objPedido?.total,
      ],
    );
    return r.lastInsertId!;
  }


  /**
   * CONFIRMAR PEDIDO
   * Actualiza los datos de la tabla pedidos en la columnas:
   * pago_confirmado = 1 -> true
   * fecha_aprobacion = NOW() -> fecha actual, cuando se aprobo el pago
   */
  
  public async confirmarPago(): Promise<void> {
    await conexion.execute(
      `UPDATE pedidos
       SET pago_confirmado = 1,
           fecha_aprobacion = NOW(),
           id_estado = 2
       WHERE id_pedido = ?`,
      [this._id_pedido],
    );
  }
}