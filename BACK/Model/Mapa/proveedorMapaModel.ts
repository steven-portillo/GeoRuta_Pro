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

export class ProveedorMapaModel {
  /** Usado por el hub WS*/
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

  public async datosProveedor(
    idProveedor: number,
    idEmpresa: number
  ):Promise<{nombre: string | null, empresa: string | null}> {
    const rows = await conexion.query(
      `
      select concat(u.nombre," ", u.apellido) as nombre, e.nombre as empresa
      from usuarios u
      left join empresas e on e.id_empresa = u.id_empresa
      where u.id_usuario = ?
        and u.id_empresa = ?
      `,
      [idProveedor, idEmpresa]
    );
    return {nombre: rows.nombre, empresa:rows.empresa}
  }


  /** Sidebar + pines de destinos. q = búsqueda opcional */
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
}