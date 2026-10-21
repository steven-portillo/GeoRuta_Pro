import { conexion } from "../conexion.ts";

export class PedidoProveedor {
  static async ListarPedidos(id_proveedor: number) {
    return await conexion.query(
      `SELECT p.id_pedido, p.fecha_pedido, p.fecha_asignacion,
              p.fecha_inicio_transito, p.fecha_entrega, p.total,
              p.metodo_pago, p.pago_confirmado,
              ep.nombre_estado AS estado,
              c.id_usuario AS id_cliente, c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              d.direccion_texto, d.latitud, d.longitud, ap.notas
       FROM asignacion_pedido ap
       INNER JOIN pedidos p ON p.id_pedido = ap.id_pedido
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       WHERE ap.id_proveedor = ?
         AND ep.nombre_estado NOT IN ('Entregado', 'Cancelado')
       ORDER BY p.fecha_pedido ASC, p.id_pedido ASC`,
      [id_proveedor],
    );
  }

  static async ObtenerDetalle(id_proveedor: number, id_pedido: number) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, p.fecha_pedido, p.fecha_aprobacion,
              p.fecha_asignacion, p.fecha_inicio_transito, p.fecha_entrega,
              p.total, p.metodo_pago, p.pago_confirmado, p.observaciones,
              ep.nombre_estado AS estado,
              c.id_usuario AS id_cliente, c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              d.direccion_texto, d.latitud, d.longitud,
              ap.fecha_asignacion AS fecha_asignacion_proveedor, ap.notas,
              pg.estado_pago
       FROM asignacion_pedido ap
       INNER JOIN pedidos p ON p.id_pedido = ap.id_pedido
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
       WHERE p.id_pedido = ? AND ap.id_proveedor = ?`,
      [id_pedido, id_proveedor],
    );
    if (!pedido) return null;

    const productos = await conexion.query(
      `SELECT p.id_producto, p.nombre, dp.cantidad, dp.precio_unitario,
              (dp.cantidad * dp.precio_unitario) AS subtotal,
              pi.url AS imagen_url
       FROM detalle_pedido dp
       INNER JOIN productos p ON p.id_producto = dp.id_producto
       LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto
         AND pi.orden = (
           SELECT MIN(pi2.orden) FROM producto_imagenes pi2
           WHERE pi2.id_producto = p.id_producto
         )
       WHERE dp.id_pedido = ?
       ORDER BY dp.id_detalle`,
      [id_pedido],
    );
    return { ...pedido, productos };
  }
}
