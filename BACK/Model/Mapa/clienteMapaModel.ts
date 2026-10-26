import { conexion } from "../conexion.ts";

export interface RepartidorMapaCliente {
  id_proveedor: number;
  nombre: string;
  empresa: string;
  foto_url: string | null;
  estado: "activo" | "descanso" | "inactivo";
  lat: number | null;
  lng: number | null;
  id_pedido: number;
}

export class ClienteMapaModel {
  public async pedidosEnTransitoCliente(idCliente: number): Promise<number[]> {
    const rows = await conexion.query(
      `SELECT id_pedido FROM pedidos WHERE id_usuario = ? AND id_estado = 4`,
      [idCliente],
    );
    return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
      Number(r.id_pedido)
    );
  }

  public async filtrarPedidosClienteEnTransito(
    idCliente: number,
    pedidoIds: number[],
  ): Promise<number[]> {
    if (!pedidoIds.length) return [];
    const ids = pedidoIds.map(Number).filter((n) => Number.isFinite(n));
    if (!ids.length) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const rows = await conexion.query(
      `
      SELECT id_pedido
      FROM pedidos
      WHERE id_usuario = ?
        AND id_estado = 4
        AND id_pedido IN (${placeholders})
      `,
      [idCliente, ...ids],
    );
    return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
      Number(r.id_pedido)
    );
  }

  public async listarRepartidoresDeCliente(
    idCliente: number,
    q?: string,
  ): Promise<RepartidorMapaCliente[]> {
    const termino = (q ?? "").trim();
    const params: unknown[] = [idCliente];

    let filtroEmpresa = "";
    if (termino) {
      filtroEmpresa = ` AND LOWER(e.nombre) LIKE ? `;
      params.push(`%${termino.toLowerCase()}%`);
    }

    const rows = await conexion.query(
      `
      SELECT
        prov.id_usuario AS id_proveedor,
        CONCAT(prov.nombre, ' ', prov.apellido) AS nombre,
        e.nombre AS empresa,
        prov.imagen_url AS foto_url,
        COALESCE(up.estado, 'inactivo') AS estado,
        up.latitud AS lat,
        up.longitud AS lng,
        p.id_pedido
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      INNER JOIN usuarios prov ON prov.id_usuario = a.id_proveedor
      INNER JOIN empresas e ON e.id_empresa = prov.id_empresa
      LEFT JOIN ubicacion_proveedor up ON up.id_proveedor = prov.id_usuario
      WHERE p.id_usuario = ?
        AND p.id_estado = 4
        ${filtroEmpresa}
      ORDER BY p.id_pedido DESC
      `,
      params,
    );

    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id_proveedor: Number(r.id_proveedor),
      nombre: String(r.nombre ?? ""),
      empresa: String(r.empresa ?? ""),
      foto_url: r.foto_url != null ? String(r.foto_url) : null,
      estado: (String(r.estado) as RepartidorMapaCliente["estado"]) ||
        "inactivo",
      lat: r.lat != null && r.lat !== "" ? Number(r.lat) : null,
      lng: r.lng != null && r.lng !== "" ? Number(r.lng) : null,
      id_pedido: Number(r.id_pedido),
    }));
  }

  public async detallePedidoCliente(
    idCliente: number,
    idPedido: number,
  ): Promise<Record<string, unknown> | null> {
    const rows = await conexion.query(
      `SELECT p.id_pedido, p.total, p.id_estado, p.fecha_pedido,
              d.direccion_texto,
              CONCAT(cli.nombre, ' ', cli.apellido) AS cliente,
              e.nombre AS empresa,
              CONCAT(prov.nombre, ' ', prov.apellido) AS repartidor
       FROM pedidos p
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       INNER JOIN usuarios cli ON cli.id_usuario = p.id_usuario
       LEFT JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
       LEFT JOIN usuarios prov ON prov.id_usuario = a.id_proveedor
       LEFT JOIN empresas e ON e.id_empresa = prov.id_empresa
       WHERE p.id_pedido = ? AND p.id_usuario = ?`,
      [idPedido, idCliente],
    );
    if (!rows?.length) return null;

    let items: unknown[] = [];
    try {
      const itemRows = await conexion.query(
        `SELECT pr.nombre AS producto, dp.cantidad, dp.precio_unitario,
                (dp.cantidad * dp.precio_unitario) AS subtotal
         FROM detalle_pedido dp
         INNER JOIN productos pr ON pr.id_producto = dp.id_producto
         WHERE dp.id_pedido = ?`,
        [idPedido],
      );
      items = itemRows ?? [];
    } catch {
      items = [];
    }

    return {
      ...(rows[0] as object),
      items,
    };
  }
}
