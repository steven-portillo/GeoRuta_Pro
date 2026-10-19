import { conexion } from "../conexion.ts";

interface AgregarStockData {
  id_producto: number;
  cantidad: number;
  motivo: string;
}

export class Inventario {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT p.id_producto, p.nombre, c.nombre AS nombre_categoria,
              COALESCE(i.stock_disponible, 0) AS stock_disponible,
              COALESCE(i.stock_reservado, 0) AS stock_reservado,
              COALESCE(i.stock_minimo, 0) AS stock_minimo,
              pi.url AS imagen_url
       FROM productos p
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
         AND pi.orden = (SELECT MIN(orden) FROM producto_imagenes WHERE id_producto = p.id_producto)
       WHERE p.id_empresa = ? AND p.activo = 1
       ORDER BY p.nombre ASC`,
      [id_empresa],
    );
  }

  static async AgregarStock(
    id_empresa: number,
    id_usuario: number,
    datos: AgregarStockData,
  ) {
    const [producto] = await conexion.query(
      `SELECT id_producto FROM productos WHERE id_producto = ? AND id_empresa = ?`,
      [datos.id_producto, id_empresa],
    );
    if (!producto) {
      return { success: false, message: "Producto no encontrado" };
    }

    try {
      await conexion.execute("START TRANSACTION");

      const [inventario] = await conexion.query(
        `SELECT stock_disponible FROM inventario WHERE id_producto = ? FOR UPDATE`,
        [datos.id_producto],
      );

      if (!inventario) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El producto no tiene inventario asociado",
        };
      }

      const stockAnterior = inventario.stock_disponible;
      const stockNuevo = stockAnterior + datos.cantidad;

      await conexion.execute(
        `UPDATE inventario SET stock_disponible = ?, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ?`,
        [stockNuevo, datos.id_producto],
      );

      await conexion.execute(
        `INSERT INTO movimientos_inventario
          (id_producto, id_usuario, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
         VALUES (?, ?, 'entrada', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          datos.id_producto,
          id_usuario,
          datos.cantidad,
          stockAnterior,
          stockNuevo,
          datos.motivo,
        ],
      );

      await conexion.execute("COMMIT");
      return {
        success: true,
        message: `Se agregaron ${datos.cantidad} unidades correctamente`,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error AgregarStock:", error);
      return { success: false, message: "Error al agregar stock" };
    }
  }

  static async HistorialMovimientos(id_producto: number, id_empresa: number) {
    const [producto] = await conexion.query(
      `SELECT nombre FROM productos WHERE id_producto = ? AND id_empresa = ?`,
      [id_producto, id_empresa],
    );

    if (!producto) return null;

    const movimientos = await conexion.query(
      `SELECT m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_nuevo, m.motivo, m.fecha,
              u.nombre AS nombre_usuario, u.apellido AS apellido_usuario
       FROM movimientos_inventario m
       INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
       WHERE m.id_producto = ?
       ORDER BY m.fecha DESC`,
      [id_producto],
    );

    return { nombre_producto: producto.nombre, movimientos };
  }
}
