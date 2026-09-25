import { conexion } from "../conexion.ts";

interface CrearProductoData {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock_minimo?: number;
}

interface EditarProductoData {
  id_categoria?: number;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock_minimo?: number;
}

export class Producto {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT p.id_producto, p.nombre, p.descripcion, p.precio, p.activo,
              c.nombre AS nombre_categoria,
              COALESCE(i.stock_disponible, 0) AS stock_disponible,
              COALESCE(i.stock_reservado, 0) AS stock_reservado,
              pi.url AS imagen_url
       FROM productos p
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
         AND pi.orden = (SELECT MIN(orden) FROM producto_imagenes WHERE id_producto = p.id_producto)
       WHERE p.id_empresa = ?
       ORDER BY p.activo DESC, p.nombre ASC`,
      [id_empresa],
    );
  }

  static async ObtenerPorId(id_producto: number, id_empresa: number) {
    const [producto] = await conexion.query(
      `SELECT p.id_producto, p.id_categoria, p.nombre, p.descripcion, p.precio, p.activo,
              c.nombre AS nombre_categoria,
              COALESCE(i.stock_disponible, 0) AS stock_disponible,
              COALESCE(i.stock_reservado, 0) AS stock_reservado,
              COALESCE(i.stock_minimo, 0) AS stock_minimo
       FROM productos p
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN inventario i ON i.id_producto = p.id_producto
       WHERE p.id_producto = ? AND p.id_empresa = ?`,
      [id_producto, id_empresa],
    );

    if (!producto) return null;

    const imagenes = await conexion.query(
      `SELECT id_imagen, url, orden FROM producto_imagenes WHERE id_producto = ? ORDER BY orden ASC`,
      [id_producto],
    );

    return { ...producto, imagenes };
  }

  static async Crear(
    id_empresa: number,
    datos: CrearProductoData,
    rutasImagenes: string[],
  ) {
    const [categoria] = await conexion.query(
      `SELECT id_categoria FROM categorias WHERE id_categoria = ? AND id_empresa = ?`,
      [datos.id_categoria, id_empresa],
    );
    if (!categoria) {
      return {
        success: false,
        message: "La categoría seleccionada no pertenece a tu empresa",
      };
    }

    try {
      await conexion.execute("START TRANSACTION");

      const productoResult = await conexion.execute(
        `INSERT INTO productos (id_empresa, id_categoria, nombre, descripcion, precio, activo, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
        [
          id_empresa,
          datos.id_categoria,
          datos.nombre,
          datos.descripcion ?? null,
          datos.precio,
        ],
      );
      const id_producto = productoResult.lastInsertId as number;

      await conexion.execute(
        `INSERT INTO inventario (id_producto, stock_disponible, stock_reservado, stock_minimo, ultima_actualizacion)
         VALUES (?, 0, 0, ?, CURRENT_TIMESTAMP)`,
        [id_producto, datos.stock_minimo ?? 0],
      );

      for (let orden = 0; orden < rutasImagenes.length; orden++) {
        await conexion.execute(
          `INSERT INTO producto_imagenes (id_producto, url, orden) VALUES (?, ?, ?)`,
          [id_producto, rutasImagenes[orden], orden],
        );
      }

      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Producto creado correctamente",
        id: id_producto,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Crear producto:", error);
      return { success: false, message: "Error al crear el producto" };
    }
  }

  static async Editar(
    id_producto: number,
    id_empresa: number,
    datos: EditarProductoData,
    nuevasRutasImagenes: string[],
  ) {
    const producto = await Producto.obtenerPropio(id_producto, id_empresa);
    if (!producto) {
      return { success: false, message: "Producto no encontrado" };
    }

    if (datos.id_categoria) {
      const [categoria] = await conexion.query(
        `SELECT id_categoria FROM categorias WHERE id_categoria = ? AND id_empresa = ?`,
        [datos.id_categoria, id_empresa],
      );
      if (!categoria) {
        return {
          success: false,
          message: "La categoría seleccionada no pertenece a tu empresa",
        };
      }
    }

    try {
      await conexion.execute("START TRANSACTION");

      await conexion.execute(
        `UPDATE productos SET id_categoria = ?, nombre = ?, descripcion = ?, precio = ?
         WHERE id_producto = ? AND id_empresa = ?`,
        [
          datos.id_categoria ?? producto.id_categoria,
          datos.nombre ?? producto.nombre,
          datos.descripcion ?? producto.descripcion,
          datos.precio ?? producto.precio,
          id_producto,
          id_empresa,
        ],
      );

      if (datos.stock_minimo !== undefined) {
        await conexion.execute(
          `UPDATE inventario SET stock_minimo = ?, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ?`,
          [datos.stock_minimo, id_producto],
        );
      }

      if (nuevasRutasImagenes.length > 0) {
        const [{ maxOrden }] = await conexion.query(
          `SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM producto_imagenes WHERE id_producto = ?`,
          [id_producto],
        );
        for (let i = 0; i < nuevasRutasImagenes.length; i++) {
          await conexion.execute(
            `INSERT INTO producto_imagenes (id_producto, url, orden) VALUES (?, ?, ?)`,
            [id_producto, nuevasRutasImagenes[i], maxOrden + 1 + i],
          );
        }
      }

      await conexion.execute("COMMIT");
      return { success: true, message: "Producto actualizado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Editar producto:", error);
      return { success: false, message: "Error al actualizar el producto" };
    }
  }

  static async CambiarEstado(
    id_producto: number,
    id_empresa: number,
    nuevoEstado: 0 | 1,
  ) {
    const result = await conexion.execute(
      `UPDATE productos SET activo = ? WHERE id_producto = ? AND id_empresa = ?`,
      [nuevoEstado, id_producto, id_empresa],
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Producto no encontrado" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }

  private static async obtenerPropio(id_producto: number, id_empresa: number) {
    const [producto] = await conexion.query(
      `SELECT id_producto, id_categoria, nombre, descripcion, precio
       FROM productos WHERE id_producto = ? AND id_empresa = ?`,
      [id_producto, id_empresa],
    );
    return producto ?? null;
  }
}
