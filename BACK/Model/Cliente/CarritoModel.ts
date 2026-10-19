import { conexion } from "../conexion.ts";

export class CarritoCliente {
  static async Obtener(id_cliente: number) {
    const [carrito] = await conexion.query(
      `SELECT c.id_carrito, c.id_empresa, e.nombre AS nombre_empresa
       FROM carritos c
       LEFT JOIN empresas e ON e.id_empresa = c.id_empresa
       WHERE c.id_cliente = ?`,
      [id_cliente],
    );
    if (!carrito) {
      return {
        id_carrito: null,
        id_empresa: null,
        nombre_empresa: null,
        items: [],
        total: 0,
      };
    }

    const items = await conexion.query(
      `SELECT ci.id_producto, ci.cantidad, p.nombre, p.descripcion, p.precio,
              i.stock_disponible - i.stock_reservado AS stock_disponible,
              (ci.cantidad * p.precio) AS subtotal,
              pi.url AS imagen_url,
              (p.activo = 1 AND c.activo = 1 AND e.estado = 1
                AND i.stock_disponible - i.stock_reservado >= ci.cantidad) AS disponible
       FROM carrito_items ci
       INNER JOIN productos p ON p.id_producto = ci.id_producto
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
         AND pi.orden = (
           SELECT MIN(pi2.orden) FROM producto_imagenes pi2
           WHERE pi2.id_producto = p.id_producto
         )
       WHERE ci.id_carrito = ?
       ORDER BY p.nombre ASC`,
      [carrito.id_carrito],
    );
    const totalCentavos = items.reduce(
      (total: number, item: { subtotal: string | number }) =>
        total + Math.round(Number(item.subtotal) * 100),
      0,
    );
    return { ...carrito, items, total: totalCentavos / 100 };
  }

  static async EstablecerCantidad(
    id_cliente: number,
    id_producto: number,
    cantidad: number,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      await conexion.execute(
        `INSERT INTO carritos (id_cliente)
         VALUES (?)
         ON DUPLICATE KEY UPDATE id_carrito = LAST_INSERT_ID(id_carrito)`,
        [id_cliente],
      );
      const [carrito] = await conexion.query(
        `SELECT id_carrito, id_empresa FROM carritos
         WHERE id_cliente = ? FOR UPDATE`,
        [id_cliente],
      );

      if (cantidad === 0) {
        await conexion.execute(
          `DELETE FROM carrito_items WHERE id_carrito = ? AND id_producto = ?`,
          [carrito.id_carrito, id_producto],
        );
        const [remaining] = await conexion.query(
          `SELECT id_producto FROM carrito_items WHERE id_carrito = ? LIMIT 1`,
          [carrito.id_carrito],
        );
        if (!remaining) {
          await conexion.execute(
            `UPDATE carritos SET id_empresa = NULL WHERE id_carrito = ?`,
            [carrito.id_carrito],
          );
        }
        await conexion.execute("COMMIT");
        return { success: true, message: "Producto eliminado del carrito" };
      }

      const [producto] = await conexion.query(
        `SELECT p.id_empresa, i.stock_disponible - i.stock_reservado AS stock_disponible
         FROM productos p
         INNER JOIN categorias cat ON cat.id_categoria = p.id_categoria
         INNER JOIN empresas e ON e.id_empresa = p.id_empresa
         INNER JOIN inventario i ON i.id_producto = p.id_producto
         WHERE p.id_producto = ? AND p.activo = 1 AND cat.activo = 1
           AND e.estado = 1
         FOR UPDATE`,
        [id_producto],
      );
      if (!producto) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "El producto no está activo o no tiene inventario",
        };
      }
      if (
        carrito.id_empresa !== null &&
        Number(carrito.id_empresa) !== Number(producto.id_empresa)
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Solo puedes tener productos de una empresa en el carrito",
        };
      }
      if (cantidad > Number(producto.stock_disponible)) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            `Stock disponible: ${producto.stock_disponible}. La cantidad solicitada supera el stock.`,
          stock_disponible: Number(producto.stock_disponible),
        };
      }

      await conexion.execute(
        `UPDATE carritos SET id_empresa = ? WHERE id_carrito = ?`,
        [producto.id_empresa, carrito.id_carrito],
      );
      await conexion.execute(
        `INSERT INTO carrito_items (id_carrito, id_producto, cantidad)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
        [carrito.id_carrito, id_producto, cantidad],
      );
      await conexion.execute("COMMIT");
      return { success: true, message: "Carrito actualizado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error EstablecerCantidad carrito:", error);
      throw error;
    }
  }

  static async EliminarItem(id_cliente: number, id_producto: number) {
    const [carrito] = await conexion.query(
      `SELECT id_carrito FROM carritos WHERE id_cliente = ?`,
      [id_cliente],
    );
    if (!carrito) return false;

    try {
      await conexion.execute("START TRANSACTION");
      await conexion.query(
        `SELECT id_carrito FROM carritos WHERE id_carrito = ? FOR UPDATE`,
        [carrito.id_carrito],
      );
      const result = await conexion.execute(
        `DELETE FROM carrito_items WHERE id_carrito = ? AND id_producto = ?`,
        [carrito.id_carrito, id_producto],
      );
      const [remaining] = await conexion.query(
        `SELECT id_producto FROM carrito_items WHERE id_carrito = ? LIMIT 1`,
        [carrito.id_carrito],
      );
      if (!remaining) {
        await conexion.execute(
          `UPDATE carritos SET id_empresa = NULL WHERE id_carrito = ?`,
          [carrito.id_carrito],
        );
      }
      await conexion.execute("COMMIT");
      return Number(result.affectedRows ?? 0) > 0;
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error EliminarItem carrito:", error);
      throw error;
    }
  }
}
