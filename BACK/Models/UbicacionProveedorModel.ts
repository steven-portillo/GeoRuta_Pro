import { conexion } from "./Conexion.ts";

interface UbicacionData {
  latitud: number;
  longitud: number;
}

export class UbicacionProveedor {
  public _idProveedor: number;
  public _ObjUbicacion: UbicacionData | null;

  constructor(idProveedor: number, ObjUbicacion: UbicacionData | null = null) {
    this._idProveedor = idProveedor;
    this._ObjUbicacion = ObjUbicacion;
  }

  // guarda o actualiza la ubicacion del proveedor (upsert por id_proveedor, que es PK)
  public async ActualizarUbicacion(): Promise<{ success: boolean; message: string }> {
    try {
      const datos = this._ObjUbicacion;
      if (!datos) return { success: false, message: "No se recibieron datos de ubicación" };

      await conexion.execute(
        `INSERT INTO ubicacion_proveedor (id_proveedor, latitud, longitud, fecha_actualizacion, estado)
         VALUES (?, ?, ?, NOW(), 'activo')
         ON DUPLICATE KEY UPDATE latitud = ?, longitud = ?, fecha_actualizacion = NOW(), estado = 'activo'`,
        [this._idProveedor, datos.latitud, datos.longitud, datos.latitud, datos.longitud],
      );

      return { success: true, message: "Ubicación actualizada" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar la ubicación" };
    }
  }

  // marca al proveedor como inactivo — se llama al cerrar la conexion websocket
  public async MarcarInactivo(): Promise<void> {
    try {
      await conexion.execute(
        `UPDATE ubicacion_proveedor SET estado = 'inactivo' WHERE id_proveedor = ?`,
        [this._idProveedor],
      );
    } catch (error) {
      console.error(error);
    }
  }
}