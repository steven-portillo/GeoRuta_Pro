import { conexion } from "../conexion.ts";

export interface PedidoIdRow {
  id_pedido: number;
}

export interface DestinoRuta {
  id_pedido: number;
  lat: number;
  lng: number;
  direccion_texto: string;
  nombre_cliente: string;
}

export interface ItemPedidoDetalle {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoDetalleProveedor {
  id_pedido: number;
  id_estado: number;
  fecha_creacion: string;
  total: number | null;
  nombre_cliente: string;
  telefono_cliente: string | null;
  email_cliente: string | null;
  direccion_texto: string;
  lat: number | null;
  lng: number | null;
  items: ItemPedidoDetalle[];
}

export class ProveedorMapaModel {
  public async pedidoEnTransitoDeProveedor(
    idProveedor: number,
  ): Promise<number[]> {
    const rows = await conexion.query(
      `SELECT p.id_pedido
       FROM pedidos p
       INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
       WHERE a.id_proveedor = ? AND p.id_estado = 4`,
      [idProveedor],
    );
    const lista = (rows ?? []) as PedidoIdRow[];
    return lista.map((r) => Number(r.id_pedido));
  }

  public async datosProveedor(
    idProveedor: number,
    idEmpresa: number | null,
  ): Promise<{ nombre: string | null; empresa: string | null }> {
    const rows = await conexion.query(
      `SELECT CONCAT(u.nombre, ' ', u.apellido) AS nombre,
              e.nombre AS empresa
       FROM usuarios u
       LEFT JOIN empresas e ON e.id_empresa = u.id_empresa
       WHERE u.id_usuario = ? AND u.id_empresa = ?`,
      [idProveedor, idEmpresa],
    );
    const [row] = (rows ?? []) as {
      nombre: string | null;
      empresa: string | null;
    }[];
    return {
      nombre: row?.nombre ?? null,
      empresa: row?.empresa ?? null,
    };
  }

  public async destinosRutaProveedor(
    idProveedor: number,
    q?: string,
  ): Promise<DestinoRuta[]> {
    const termino = (q ?? "").trim();
    const params: unknown[] = [idProveedor];

    let filtro = "";
    if (termino) {
      filtro = `
        AND (
          LOWER(CONCAT(u.nombre, ' ', u.apellido)) LIKE ?
          OR LOWER(IFNULL(d.direccion_texto, '')) LIKE ?
        )
      `;
      const like = `%${termino.toLowerCase()}%`;
      params.push(like, like);
    }

    const result = await conexion.query(
      `
      SELECT
        p.id_pedido,
        d.latitud AS lat,
        d.longitud AS lng,
        d.direccion_texto,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_cliente
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
      INNER JOIN usuarios u ON u.id_usuario = p.id_cliente
      WHERE a.id_proveedor = ?
        AND p.id_estado = 4
        AND d.latitud IS NOT NULL
        AND d.longitud IS NOT NULL
        ${filtro}
      ORDER BY p.id_pedido DESC
      `,
      params,
    );

    return ((result ?? []) as Record<string, unknown>[]).map((r) => ({
      id_pedido: Number(r.id_pedido),
      lat: Number(r.lat),
      lng: Number(r.lng),
      direccion_texto: String(r.direccion_texto ?? ""),
      nombre_cliente: String(r.nombre_cliente ?? ""),
    }));
  }

  public async detallePedidoProveedor(
    idProveedor: number,
    idPedido: number,
  ): Promise<PedidoDetalleProveedor | null> {
    const rows = await conexion.query(
      `
      SELECT
        p.id_pedido,
        p.id_estado,
        p.fecha_creacion,
        p.total,
        CONCAT(cli.nombre, ' ', cli.apellido) AS nombre_cliente,
        cli.telefono AS telefono_cliente,
        cli.email AS email_cliente,
        d.direccion_texto,
        d.latitud AS lat,
        d.longitud AS lng
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      INNER JOIN usuarios cli ON cli.id_usuario = p.id_cliente
      INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
      WHERE p.id_pedido = ?
        AND a.id_proveedor = ?
      `,
      [idPedido, idProveedor],
    );

    const lista = (rows ?? []) as Record<string, unknown>[];
    if (!lista.length) return null;

    const r = lista[0];

    // Ajusta nombres de tabla/columnas a tu esquema de líneas de pedido
    let items: ItemPedidoDetalle[] = [];
    try {
      const itemRows = await conexion.query(
        `
        SELECT
          pr.nombre AS producto,
          dp.cantidad,
          dp.precio_unitario,
          (dp.cantidad * dp.precio_unitario) AS subtotal
        FROM detalle_pedido dp
        INNER JOIN productos pr ON pr.id_producto = dp.id_producto
        WHERE dp.id_pedido = ?
        `,
        [idPedido],
      );
      items = ((itemRows ?? []) as Record<string, unknown>[]).map((it) => ({
        producto: String(it.producto ?? ""),
        cantidad: Number(it.cantidad ?? 0),
        precio_unitario: Number(it.precio_unitario ?? 0),
        subtotal: Number(it.subtotal ?? 0),
      }));
    } catch (e) {
      console.error("detallePedidoProveedor items:", e);
      items = [];
    }

    return {
      id_pedido: Number(r.id_pedido),
      id_estado: Number(r.id_estado),
      fecha_creacion: String(r.fecha_creacion ?? ""),
      total: r.total != null ? Number(r.total) : null,
      nombre_cliente: String(r.nombre_cliente ?? ""),
      telefono_cliente:
        r.telefono_cliente != null ? String(r.telefono_cliente) : null,
      email_cliente: r.email_cliente != null ? String(r.email_cliente) : null,
      direccion_texto: String(r.direccion_texto ?? ""),
      lat: r.lat != null && r.lat !== "" ? Number(r.lat) : null,
      lng: r.lng != null && r.lng !== "" ? Number(r.lng) : null,
      items,
    };
  }
}
