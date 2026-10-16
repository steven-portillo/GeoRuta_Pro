import { conexion } from "./Conexion.ts";

interface CalificacionProducto {
  idProducto: number;
  calificacion: number;
}

interface ResenaPedidoData {
  idPedido: number;
  calificaciones: CalificacionProducto[];
  comentario?: string;
}

interface PedidoPendiente {
  idPedido: number;
  fecha: unknown;
  empresa: unknown;
  empresaLogo: string;
  productos: {
    idProducto: number;
    producto: unknown;
    productoImagen: string;
    cantidad: unknown;
  }[];
}

interface PedidoEnviado {
  idPedido: number;
  fecha: unknown;
  empresa: unknown;
  empresaLogo: string;
  promedio: number;
  comentario: string;
  productos: {
    idProducto: number;
    producto: unknown;
    productoImagen: string;
    calificacion: number;
  }[];
}

export class Resena {
  public _idCliente: number | null;
  public _ObjResena: ResenaPedidoData | null;

  constructor(idCliente: number | null = null, ObjResena: ResenaPedidoData | null = null) {
    this._idCliente = idCliente;
    this._ObjResena = ObjResena;
  }

  // pedidos entregados con productos sin reseña (pendientes) + pedidos ya reseñados (enviadas),
  // ambos agrupados por pedido para que la vista pinte una tarjeta desplegable por pedido
  public async ObtenerPendientesYEnviadas(): Promise<{
    success: boolean;
    message: string;
    pendientes?: PedidoPendiente[];
    enviadas?: PedidoEnviado[];
  }> {
    if (!this._idCliente) return { success: false, message: "Cliente no identificado" };

    try {
      // fecha de referencia: la de entrega si existe, si no la del pedido
      const { rows: pendientesRows } = await conexion.execute(
        `SELECT
           p.id_pedido, COALESCE(p.fecha_entrega, p.fecha_pedido) AS fecha_ref,
           e.nombre AS empresa, e.logo_url AS empresa_logo,
           pr.id_producto, pr.nombre AS producto, pr.imagen_url AS producto_imagen,
           dp.cantidad
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
         ORDER BY fecha_ref DESC, p.id_pedido DESC, pr.nombre ASC`,
        [this._idCliente, this._idCliente],
      );

      // agrupa las filas (una por producto) en un pedido con su lista de productos
      const mapaPendientes = new Map<number, PedidoPendiente>();
      for (const fila of pendientesRows as Record<string, unknown>[]) {
        const idPedido = fila.id_pedido as number;
        if (!mapaPendientes.has(idPedido)) {
          mapaPendientes.set(idPedido, {
            idPedido,
            fecha: fila.fecha_ref,
            empresa: fila.empresa,
            empresaLogo: (fila.empresa_logo as string) ?? "",
            productos: [],
          });
        }
        mapaPendientes.get(idPedido)!.productos.push({
          idProducto: fila.id_producto as number,
          producto: fila.producto,
          productoImagen: (fila.producto_imagen as string) ?? "",
          cantidad: fila.cantidad,
        });
      }
      const pendientes = [...mapaPendientes.values()];

            // la fecha que se muestra es la de entrega del pedido (o la del pedido si no hay);
      // asi no depende de resenas.fecha, que en datos viejos esta en cero
      const { rows: enviadasRows } = await conexion.execute(
        `SELECT
           r.id_resena, r.id_pedido, r.id_producto, r.calificacion, r.comentario,
           COALESCE(p.fecha_entrega, p.fecha_pedido) AS fecha_ref,
           pr.nombre AS producto, pr.imagen_url AS producto_imagen,
           e.nombre AS empresa, e.logo_url AS empresa_logo,
           rp.comentario AS comentario_pedido
         FROM resenas r
         INNER JOIN productos pr ON r.id_producto = pr.id_producto
         INNER JOIN pedidos p ON r.id_pedido = p.id_pedido
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN resenas_pedido rp ON rp.id_pedido = r.id_pedido AND rp.id_cliente = r.id_cliente
         WHERE r.id_cliente = ? AND r.activo = 1
         ORDER BY fecha_ref DESC, r.id_pedido DESC, r.id_resena ASC`,
        [this._idCliente],
      );

      const mapaEnviadas = new Map<number, PedidoEnviado>();
      const sumas = new Map<number, number>();
      for (const fila of enviadasRows as Record<string, unknown>[]) {
        const idPedido = fila.id_pedido as number;
        if (!mapaEnviadas.has(idPedido)) {
          mapaEnviadas.set(idPedido, {
            idPedido,
            fecha: fila.fecha_ref,
            empresa: fila.empresa,
            empresaLogo: (fila.empresa_logo as string) ?? "",
            promedio: 0,
            comentario: (fila.comentario_pedido as string) ?? "",
            productos: [],
          });
          sumas.set(idPedido, 0);
        }
        const grupo = mapaEnviadas.get(idPedido)!;
        if (!grupo.comentario && fila.comentario) grupo.comentario = fila.comentario as string;
        grupo.productos.push({
          idProducto: fila.id_producto as number,
          producto: fila.producto,
          productoImagen: (fila.producto_imagen as string) ?? "",
          calificacion: fila.calificacion as number,
        });
        sumas.set(idPedido, sumas.get(idPedido)! + (fila.calificacion as number));
      }

      // promedio con un decimal por pedido
      for (const [idPedido, grupo] of mapaEnviadas) {
        grupo.promedio = Math.round((sumas.get(idPedido)! / grupo.productos.length) * 10) / 10;
      }
      const enviadas = [...mapaEnviadas.values()];

      return { success: true, message: "Reseñas obtenidas", pendientes, enviadas };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las reseñas" };
    }
  }

  // guarda de una vez las calificaciones de todos los productos pendientes del pedido
  // y el comentario general; todo en una transaccion (o se guarda todo o nada)
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

      const idsEnviados = datos.calificaciones.map((c) => c.idProducto);
      if (new Set(idsEnviados).size !== idsEnviados.length) {
        return { success: false, message: "Hay productos repetidos en la reseña" };
      }

      // productos del pedido que todavia no tienen reseña de este cliente
      const { rows: pendientesRows } = await conexion.execute(
        `SELECT dp.id_producto
         FROM detalle_pedido dp
         WHERE dp.id_pedido = ?
           AND NOT EXISTS (
             SELECT 1 FROM resenas r
             WHERE r.id_pedido = dp.id_pedido AND r.id_producto = dp.id_producto AND r.id_cliente = ?
           )`,
        [datos.idPedido, this._idCliente],
      );
      const idsPendientes = new Set((pendientesRows as { id_producto: number }[]).map((f) => f.id_producto));

      if (idsPendientes.size === 0) {
        return { success: false, message: "Ya enviaste la reseña de este pedido" };
      }
      if (idsEnviados.some((id) => !idsPendientes.has(id))) {
        return { success: false, message: "Algún producto no pertenece a este pedido o ya fue reseñado" };
      }
      if (idsPendientes.size !== idsEnviados.length) {
        return { success: false, message: "Debes calificar todos los productos del pedido" };
      }

      const comentario = datos.comentario?.trim() || null;
      const idCliente = this._idCliente;

      await conexion.transaction(async (conn) => {
        for (const item of datos.calificaciones) {
             await conn.execute(
            `INSERT INTO resenas (id_pedido, id_cliente, id_producto, calificacion, fecha)
             VALUES (?, ?, ?, ?, NOW())`,
            [datos.idPedido, idCliente, item.idProducto, item.calificacion],
          );
        }

        if (comentario) {
          await conn.execute(
            `INSERT INTO resenas_pedido (id_pedido, id_cliente, comentario)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE comentario = VALUES(comentario)`,
            [datos.idPedido, idCliente, comentario],
          );
        }
      });

      return { success: true, message: "¡Reseña enviada correctamente!" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible guardar la reseña" };
    }
  }
}