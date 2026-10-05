import { conexion } from "./conexion.ts";

interface Inventario {
  stock_disponible: number;
}

export class InventarioModel {
  public _objInventario: Inventario | null;
  public _id_producto: number | null;

  constructor(objInventario: Inventario| null = null,id_producto: number | null = null) {
    this._objInventario = objInventario
    this._id_producto = id_producto;
  }


  //listar stock de un producto segun su id
  public async getStock(): Promise<Inventario | null> {
    const filas = await conexion.query(
      "SELECT stock_disponible FROM inventario WHERE id_producto = ?",
      [this._id_producto],
    );
    return filas[0] ?? null;
  }

  /**
   * DESCONTAR STOCK
   * stock_disponible: actualiza la tabla inventario en la columna
   * de stock_disponible realizando una operacion matematica restado el stock_disponible
   * menos la cantidad necesitada
   * ultima_actualizacion: actualiza la fecha en la cual se desconto el stock
   */
  public async descontarStock(cantidad: number): Promise<void> {
    await conexion.execute(
      `UPDATE inventario
       SET stock_disponible = stock_disponible - ?, ultima_actualizacion = NOW()
       WHERE id_producto = ? AND stock_disponible >= ?`,
      [cantidad, this._id_producto, cantidad],
    );
  }

  public async stockDisponible(): Promise<Inventario[]>{
    const result = await conexion.query(`
      SELECT id_producto, stock_disponible FROM inventario
    `)
    return result as Inventario[];
  }
}