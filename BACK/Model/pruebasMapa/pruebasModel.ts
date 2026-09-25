import { conexion } from "../conexion.ts";

export interface PedidoIdRow {
  id_pedido: number;
}

export class pedidosModel {
  public async pedidoEnTransitoDeProveedor(
    idProveedor: number,
  ): Promise<number[]> {
    const rows = await conexion.query(
      `
      SELECT p.id_pedido
      FROM pedidos p
      INNER JOIN asignacion_pedido a ON a.id_pedido = p.id_pedido
      WHERE a.id_proveedor = ?
        AND p.id_estado = 4
      `,
      [idProveedor],
    );

    const lista = (rows ?? []) as PedidoIdRow[];
    return lista.map((r) => Number(r.id_pedido));
  }

  public async filtrarPedidosClienteEnTransito(
    idCliente: number,
    pedidoIds: number[],
  ): Promise<number[]> {
    if (!pedidoIds.length) return [];

    const ids = pedidoIds.map(Number).filter((n) => Number.isFinite(n));
    if (!ids.length) return [];

    const placeholders = ids.map(() => "?").join(", ");
    const  rows  = await conexion.query(
      `
    SELECT id_pedido
    FROM pedidos
    WHERE id_cliente = ?
      AND id_estado = 4
      AND id_pedido IN (${placeholders})
    `,
      [idCliente, ...ids],
    );

    console.log("filtro SQL", { idCliente, ids, rows });

    return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
      Number(r.id_pedido)
    );
  }

  public async pedidosEnTransitoCliente(idCliente: number): Promise<number[]> {
    const rows = await conexion.query(
      `SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND id_estado = 4`,
      [idCliente],
    );
    return ((rows ?? []) as { id_pedido: number }[]).map((r) =>
      Number(r.id_pedido)
    );
  }
}

//REPARTIDOR

export interface DestinoRuta {
  id_pedido: number;
  lat: number;
  lng: number;
  direccion_texto: string;
  nombre_cliente: string;
}

export class repartidorModel {
  public async destinosRutaProveedor(
    idProveedor: number,
  ): Promise<DestinoRuta[]> {
    const { rows } = await conexion.query(
      `
    SELECT
      p.id_pedido,
      d.latitud  AS lat,
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
    `,
      [idProveedor],
    );
    return (rows ?? []) as DestinoRuta[];
  }
}
