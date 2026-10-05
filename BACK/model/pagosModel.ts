import { conexion } from "./conexion.ts";

interface datosPago {
  id_pedido: number;
  referencia_ext: string;
  monto: number;
  respuesta_raw: string;
}

export class pagosModel {
  public _objPagos: datosPago | null;
  public _id_pago: number | null;

  constructor(
    objPagos: datosPago | null = null,
    id_pago: number | null = null,
  ) {
    this._objPagos = objPagos;
    this._id_pago = id_pago;
  }

  /**
   * REGISTRO DE PAGOS
   * Registra la lista de pagos dejando por predeterminada:
   * pasarela = stripe
   * estado_pago = enum('aprobado')
   * fecha_pago = NOW() -> fecha en la cual se realizo la compra
   */
  public async registrarPago(): Promise<void> {
    await conexion.execute(
      `INSERT INTO pagos 
        (id_pedido, pasarela, referencia_ext, monto, estado_pago, fecha_pago, respuesta_raw)
       VALUES (?, 'stripe', ?, ?, 'aprobado', NOW(), ?)`,
      [
        this._objPagos?.id_pedido,
        this._objPagos?.referencia_ext,
        this._objPagos?.monto,
        this._objPagos?.respuesta_raw,
      ],
    );
  }
}