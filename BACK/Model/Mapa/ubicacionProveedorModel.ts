import { conexion } from "../conexion.ts";

export type EstadoUbicacion = "activo" | "descanso" | "inactivo";

export interface FilaUbicacion {
  id_proveedor: number;
  latitud: number;
  longitud: number;
  estado: EstadoUbicacion;
  fecha_actualizacion: string;
}

export class UbicacionProveedorModel {
  async upsertEstado(
    idProveedor: number,
    estado: EstadoUbicacion,
  ): Promise<void> {
    await conexion.query(
      `
      INSERT INTO ubicacion_proveedor
        (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
      VALUES (?, 0, 0, ?, NOW())
      ON DUPLICATE KEY UPDATE
        estado = VALUES(estado),
        fecha_actualizacion = NOW()
      `,
      [idProveedor, estado],
    );
  }


  async upsertUbicacion(
    idProveedor: number,
    lat: number,
    lng: number,
    estado?: EstadoUbicacion,
  ): Promise<void> {
    if (estado) {
      await conexion.query(
        `
        INSERT INTO ubicacion_proveedor
          (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          latitud = VALUES(latitud),
          longitud = VALUES(longitud),
          estado = VALUES(estado),
          fecha_actualizacion = NOW()
        `,
        [idProveedor, lat, lng, estado],
      );
    } else {
      await conexion.query(
        `
        INSERT INTO ubicacion_proveedor
          (id_proveedor, latitud, longitud, estado, fecha_actualizacion)
        VALUES (?, ?, ?, 'activo', NOW())
        ON DUPLICATE KEY UPDATE
          latitud = VALUES(latitud),
          longitud = VALUES(longitud),
          fecha_actualizacion = NOW()
        `,
        [idProveedor, lat, lng],
      );
    }
  }

  async obtenerPorProveedor(
    idProveedor: number,
  ): Promise<FilaUbicacion | null> {
    console.log(idProveedor)
    const  rows  = await conexion.query(
      `
      SELECT id_proveedor, latitud, longitud, estado, fecha_actualizacion
      FROM ubicacion_proveedor
      WHERE id_proveedor = ?
      `,
      [idProveedor],
    );
    if (!rows?.length) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id_proveedor: Number(r.id_proveedor),
      latitud: Number(r.latitud),
      longitud: Number(r.longitud),
      estado: r.estado as EstadoUbicacion,
      fecha_actualizacion: String(r.fecha_actualizacion ?? ""),
    };
  }
}