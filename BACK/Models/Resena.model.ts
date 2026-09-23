import { conexion } from "./Conexion.ts";

interface ResenaData {
  idPedido: number;
  idProducto: number;
  calificacion: number;
  comentario?: string;
}

export class Resena {
  public _idCliente: number | null;
  public _ObjResena: ResenaData | null;

  constructor(idCliente: number | null = null, ObjResena: ResenaData | null = null) {
    this._idCliente = idCliente;
    this._ObjResena = ObjResena;
  }

  // productos entregados sin reseña (pendientes) + reseñas ya enviadas por el cliente
  public async ObtenerPendientesYEnviadas(): Promise<{
    success: boolean;
    message: string;
    pendientes?: unknown[];
    enviadas?: unknown[];
  }> {
    if (!this._idCliente) return { success: false, message: "Cliente no identificado" };

    try {
      const { rows: pendientesRows } = await conexion.execute(
        `SELECT
           p.id_pedido, p.fecha_pedido,
           e.nombre AS empresa, e.logo_url AS empresa_logo,
           pr.id_producto, pr.nombre AS producto, pr.imagen_url AS producto_imagen,
           dp.cantidad, dp.precio_unitario
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         INNER JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
         INNER JOIN productos pr ON dp.id_producto = pr.id_producto
         WHERE p.id_cliente = ?
           AND ep.nombre_estado = 'Entregado'
           AND NOT EXISTS (
             SELECT 1 FROM resenas r
             WHERE r.id_pedido = p.id_pedido AND r.id_producto = pr.id_producto AND r.id_cliente = ?
           )
         ORDER BY p.fecha_pedido DESC`,
        [this._idCliente, this._idCliente],
      );

      const pendientes = (pendientesRows as Record<string, unknown>[]).map((fila) => ({
        idPedido: fila.id_pedido,
        fecha: fila.fecha_pedido,
        empresa: fila.empresa,
        empresaLogo: fila.empresa_logo ?? "",
        idProducto: fila.id_producto,
        producto: fila.producto,
        productoImagen: fila.producto_imagen ?? "",
        cantidad: fila.cantidad,
        precioUnitario: fila.precio_unitario,
      }));

      const { rows: enviadasRows } = await conexion.execute(
        `SELECT
           r.id_resena, r.id_pedido, r.calificacion, r.comentario, r.fecha,
           pr.nombre AS producto, pr.imagen_url AS producto_imagen,
           e.nombre AS empresa, e.logo_url AS empresa_logo
         FROM resenas r
         INNER JOIN productos pr ON r.id_producto = pr.id_producto
         INNER JOIN pedidos p ON r.id_pedido = p.id_pedido
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         WHERE r.id_cliente = ? AND r.activo = 1
         ORDER BY r.fecha DESC`,
        [this._idCliente],
      );

      const enviadas = (enviadasRows as Record<string, unknown>[]).map((fila) => ({
        idResena: fila.id_resena,
        idPedido: fila.id_pedido,
        calificacion: fila.calificacion,
        comentario: fila.comentario ?? "",
        fecha: fila.fecha,
        producto: fila.producto,
        productoImagen: fila.producto_imagen ?? "",
        empresa: fila.empresa,
        empresaLogo: fila.empresa_logo ?? "",
      }));

      return { success: true, message: "Reseñas obtenidas", pendientes, enviadas };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las reseñas" };
    }
  }

  // valida en 3 pasos antes de insertar: pedido entregado del cliente, producto pertenece al pedido, sin duplicado
  public async Guardar(): Promise<{ success: boolean; message: string }> {
    const datos = this._ObjResena;
    if (!this._idCliente || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: pedidoValido } = await conexion.execute(
        `SELECT p.id_pedido
         FROM pedidos p
         INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
         WHERE p.id_pedido = ? AND p.id_cliente = ? AND ep.nombre_estado = 'Entregado'`,
        [datos.idPedido, this._idCliente],
      );
      if (!pedidoValido || pedidoValido.length === 0) {
        return { success: false, message: "No puedes reseñar este pedido" };
      }

      const { rows: productoEnPedido } = await conexion.execute(
        `SELECT id_producto FROM detalle_pedido WHERE id_pedido = ? AND id_producto = ?`,
        [datos.idPedido, datos.idProducto],
      );
      if (!productoEnPedido || productoEnPedido.length === 0) {
        return { success: false, message: "Producto no pertenece a este pedido" };
      }

      const { rows: duplicado } = await conexion.execute(
        `SELECT id_resena FROM resenas WHERE id_pedido = ? AND id_producto = ? AND id_cliente = ?`,
        [datos.idPedido, datos.idProducto, this._idCliente],
      );
      if ((duplicado?.length ?? 0) > 0) {
        return { success: false, message: "Ya enviaste una reseña para este producto" };
      }

      await conexion.execute(
        `INSERT INTO resenas (id_pedido, id_cliente, id_producto, calificacion, comentario)
         VALUES (?, ?, ?, ?, ?)`,
        [datos.idPedido, this._idCliente, datos.idProducto, datos.calificacion, datos.comentario?.trim() || null],
      );

      return { success: true, message: "¡Reseña enviada correctamente!" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible guardar la reseña" };
    }
  }
}