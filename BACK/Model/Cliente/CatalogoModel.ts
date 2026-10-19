import { conexion } from "../conexion.ts";

export class CatalogoCliente {
  static async ListarEmpresas() {
    return await conexion.query(
      `SELECT e.id_empresa AS id, e.nombre, e.logo_url AS logoUrl,
              e.descripcion, NULL AS portadaUrl,
              e.color_primario, e.color_acento
       FROM empresas e
       WHERE e.estado = 1
         AND EXISTS (
           SELECT 1
           FROM productos p
           INNER JOIN categorias c ON c.id_categoria = p.id_categoria
           INNER JOIN inventario i ON i.id_producto = p.id_producto
           WHERE p.id_empresa = e.id_empresa
             AND p.activo = 1 AND c.activo = 1
             AND i.stock_disponible - i.stock_reservado > 0
         )
       ORDER BY e.nombre ASC`,
    );
  }

  static async ListarProductos(id_empresa: number) {
    return await conexion.query(
      `SELECT p.id_producto AS id, p.id_empresa, p.nombre, p.descripcion,
              p.precio, c.id_categoria, c.nombre AS categoria,
              i.stock_disponible - i.stock_reservado AS stock,
              pi.url AS imagenUrl
       FROM productos p
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa AND e.estado = 1
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria AND c.activo = 1
       INNER JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
         AND pi.orden = (
           SELECT MIN(pi2.orden) FROM producto_imagenes pi2
           WHERE pi2.id_producto = p.id_producto
         )
       WHERE p.id_empresa = ? AND p.activo = 1
         AND i.stock_disponible - i.stock_reservado > 0
       ORDER BY p.nombre ASC`,
      [id_empresa],
    );
  }

  static async ObtenerProducto(id_producto: number) {
    const [producto] = await conexion.query(
      `SELECT p.id_producto, p.id_empresa, p.nombre, p.descripcion, p.precio,
              e.nombre AS nombre_empresa, c.id_categoria,
              c.nombre AS nombre_categoria,
              i.stock_disponible - i.stock_reservado AS stock_disponible
       FROM productos p
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa AND e.estado = 1
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria AND c.activo = 1
       INNER JOIN inventario i ON i.id_producto = p.id_producto
       WHERE p.id_producto = ? AND p.activo = 1
         AND i.stock_disponible - i.stock_reservado > 0`,
      [id_producto],
    );
    if (!producto) return null;

    const imagenes = await conexion.query(
      `SELECT id_imagen, url, orden FROM producto_imagenes
       WHERE id_producto = ? ORDER BY orden ASC`,
      [id_producto],
    );
    const resenas = await conexion.query(
      `SELECT r.id_resena, r.calificacion, r.comentario, r.fecha,
              u.nombre AS nombre_cliente, u.apellido AS apellido_cliente
       FROM resenas r
       INNER JOIN usuarios u ON u.id_usuario = r.id_cliente
       WHERE r.id_producto = ? AND r.activo = 1
       ORDER BY r.fecha DESC`,
      [id_producto],
    );

    return { ...producto, imagenes, resenas };
  }
}
