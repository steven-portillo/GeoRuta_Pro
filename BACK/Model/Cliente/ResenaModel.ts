import { conexion } from "../conexion.ts";

interface ResenaData {
  calificacion?: number;
  comentario?: string | null;
}

export class ResenaCliente {
  static async Listar(id_cliente: number) {
    const pendientes = await conexion.query(
      `SELECT p.id_pedido AS idPedido, p.fecha_pedido AS fecha,
              e.nombre AS empresa, e.logo_url AS empresaLogo,
              pr.id_producto AS idProducto, pr.nombre AS producto,
              (SELECT pi.url FROM producto_imagenes pi
               WHERE pi.id_producto = pr.id_producto
               ORDER BY pi.orden ASC LIMIT 1) AS productoImagen,
              dp.cantidad, dp.precio_unitario AS precioUnitario
       FROM pedidos p
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       INNER JOIN productos pr ON pr.id_producto = dp.id_producto
       WHERE p.id_usuario = ? AND ep.nombre_estado = 'Entregado'
         AND NOT EXISTS (
           SELECT 1 FROM resenas r
           WHERE r.id_pedido = p.id_pedido
             AND r.id_producto = pr.id_producto
         )
       ORDER BY p.fecha_pedido DESC, pr.nombre ASC`,
      [id_cliente],
    );
    const enviadas = await conexion.query(
      `SELECT r.id_resena AS idResena, r.id_pedido AS idPedido,
              r.calificacion, r.comentario, r.fecha, pr.nombre AS producto,
              (SELECT pi.url FROM producto_imagenes pi
               WHERE pi.id_producto = pr.id_producto
               ORDER BY pi.orden ASC LIMIT 1) AS productoImagen,
              e.nombre AS empresa, e.logo_url AS empresaLogo
       FROM resenas r
       INNER JOIN pedidos p ON p.id_pedido = r.id_pedido
       INNER JOIN productos pr ON pr.id_producto = r.id_producto
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       WHERE r.id_cliente = ? AND p.id_usuario = ? AND r.activo = 1
       ORDER BY r.fecha DESC`,
      [id_cliente, id_cliente],
    );
    return { pendientes, enviadas };
  }

  static async Crear(
    id_cliente: number,
    id_pedido: number,
    id_producto: number,
    calificacion: number,
    comentario?: string,
  ) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido
       FROM pedidos p
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       WHERE p.id_pedido = ? AND p.id_usuario = ?
         AND dp.id_producto = ? AND ep.nombre_estado = 'Entregado'`,
      [id_pedido, id_cliente, id_producto],
    );
    if (!pedido) {
      return {
        success: false,
        message: "Solo puedes reseñar productos de tus pedidos entregados",
      };
    }
    const [existente] = await conexion.query(
      `SELECT id_resena FROM resenas
       WHERE id_pedido = ? AND id_producto = ?`,
      [id_pedido, id_producto],
    );
    if (existente) {
      return {
        success: false,
        message: "Ya existe una reseña para este producto y pedido",
      };
    }

    await conexion.execute(
      `INSERT INTO resenas
         (id_pedido, id_cliente, id_producto, calificacion, comentario, fecha, activo)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
      [id_pedido, id_cliente, id_producto, calificacion, comentario ?? null],
    );
    return { success: true, message: "Reseña creada correctamente" };
  }

  static async Editar(
    id_cliente: number,
    id_resena: number,
    datos: ResenaData,
  ) {
    const [resena] = await conexion.query(
      `SELECT id_resena FROM resenas
       WHERE id_resena = ? AND id_cliente = ?`,
      [id_resena, id_cliente],
    );
    if (!resena) return { success: false, message: "Reseña no encontrada" };

    const campos: string[] = [];
    const valores: unknown[] = [];
    if (datos.calificacion !== undefined) {
      campos.push("calificacion = ?");
      valores.push(datos.calificacion);
    }
    if (datos.comentario !== undefined) {
      campos.push("comentario = ?");
      valores.push(datos.comentario);
    }
    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }
    valores.push(id_resena, id_cliente);
    await conexion.execute(
      `UPDATE resenas SET ${campos.join(", ")}
       WHERE id_resena = ? AND id_cliente = ?`,
      valores,
    );
    return { success: true, message: "Reseña actualizada correctamente" };
  }

  static async Desactivar(id_cliente: number, id_resena: number) {
    const result = await conexion.execute(
      `UPDATE resenas SET activo = 0
       WHERE id_resena = ? AND id_cliente = ? AND activo = 1`,
      [id_resena, id_cliente],
    );
    return Number(result.affectedRows ?? 0) > 0;
  }
}
