import { conexion } from "../conexion.ts";

export type EstadoUbicacionMapa = "activo" | "descanso" | "inactivo";

export interface RepartidorMapaAdmin {
  id_proveedor: number;
  nombre: string;
  empresa: string;
  foto_url: string | null;
  estado: EstadoUbicacionMapa;
  lat: number | null;
  lng: number | null;
  pedidos_en_transito: number;
  pedidos_entregados_hoy: number;
}

export class AdminMapaModel {
  public async listarRepartidoresEmpresa(
    idEmpresa: number,
    q?: string,
  ): Promise<RepartidorMapaAdmin[]> {
    const termino = (q ?? "").trim();
    const params: unknown[] = [idEmpresa];

    let filtroNombre = "";
    if (termino) {
      filtroNombre = ` AND LOWER(CONCAT(u.nombre, ' ', u.apellido)) LIKE ? `;
      params.push(`%${termino.toLowerCase()}%`);
    }

    const rows = await conexion.query(
      `
      SELECT
        u.id_usuario AS id_proveedor,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre,
        e.nombre AS empresa,
        u.imagen_url AS foto_url,
        COALESCE(up.estado, 'inactivo') AS estado,
        up.latitud AS lat,
        up.longitud AS lng,
        (
          SELECT COUNT(*)
          FROM asignacion_pedido a
          INNER JOIN pedidos p ON p.id_pedido = a.id_pedido
          WHERE a.id_proveedor = u.id_usuario
            AND p.id_estado = 4
        ) AS pedidos_en_transito,
        (
          SELECT COUNT(*)
          FROM asignacion_pedido a
          INNER JOIN pedidos p ON p.id_pedido = a.id_pedido
          WHERE a.id_proveedor = u.id_usuario
            AND p.id_estado = 5
            AND DATE(COALESCE(p.fecha_entrega, p.fecha_inicio_transito)) = CURDATE()
        ) AS pedidos_entregados_hoy
      FROM usuarios u
      INNER JOIN empresas e ON e.id_empresa = u.id_empresa
      LEFT JOIN ubicacion_proveedor up ON up.id_proveedor = u.id_usuario
      WHERE u.id_empresa = ?
        AND u.id_rol = 3
        ${filtroNombre}
      ORDER BY
        FIELD(COALESCE(up.estado, 'inactivo'), 'activo', 'descanso', 'inactivo'),
        nombre
      `,
      params,
    );

    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id_proveedor: Number(r.id_proveedor),
      nombre: String(r.nombre ?? ""),
      empresa: String(r.empresa ?? ""),
      foto_url: r.foto_url != null ? String(r.foto_url) : null,
      estado: (String(r.estado) as EstadoUbicacionMapa) || "inactivo",
      lat: r.lat != null && r.lat !== "" ? Number(r.lat) : null,
      lng: r.lng != null && r.lng !== "" ? Number(r.lng) : null,
      pedidos_en_transito: Number(r.pedidos_en_transito ?? 0),
      pedidos_entregados_hoy: Number(r.pedidos_entregados_hoy ?? 0),
    }));
  }
}
