import { conexion } from "./Conexion.ts";

interface DireccionData {
  direccionTexto: string;
  latitud: number;
  longitud: number;
}

interface DireccionRow {
  id_direccion: number;
  direccion_texto: string;
  latitud: number;
  longitud: number;
}

export class Direccion {
  public _idDireccion: number | null;
  public _idUsuario: number | null;
  public _ObjDireccion: DireccionData | null;

  constructor(
    idDireccion: number | null = null,
    idUsuario: number | null = null,
    ObjDireccion: DireccionData | null = null,
  ) {
    this._idDireccion = idDireccion;
    this._idUsuario = idUsuario;
    this._ObjDireccion = ObjDireccion;
  }

  
  // el cliente puede acumular varias y elegir una al crear el pedido
  public async Crear(): Promise<{ success: boolean; message: string; data?: { id: number } }> {
    const datos = this._ObjDireccion;
    if (!this._idUsuario || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { lastInsertId } = await conexion.execute(
        `INSERT INTO direcciones (id_usuario, direccion_texto, latitud, longitud, activo)
         VALUES (?, ?, ?, ?, 1)`,
        [this._idUsuario, datos.direccionTexto, datos.latitud, datos.longitud],
      );

      return {
        success: true,
        message: "Dirección guardada correctamente",
        data: { id: lastInsertId as number },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible guardar la dirección" };
    }
  }

  public async ObtenerPorUsuario(): Promise<{ success: boolean; message: string; data?: DireccionRow[] }> {
    if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

    try {
      const { rows } = await conexion.execute(
        `SELECT id_direccion, direccion_texto, latitud, longitud
         FROM direcciones
         WHERE id_usuario = ? AND activo = 1
         ORDER BY id_direccion DESC`,
        [this._idUsuario],
      );

      return { success: true, message: "Direcciones obtenidas", data: rows as DireccionRow[] };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las direcciones" };
    }
  }

  // baja logica: valida que la direccion pertenezca al usuario antes de desactivarla
  public async Eliminar(): Promise<{ success: boolean; message: string }> {
    if (!this._idDireccion || !this._idUsuario) return { success: false, message: "Datos incompletos" };

    try {
      const { affectedRows } = await conexion.execute(
        `UPDATE direcciones SET activo = 0 WHERE id_direccion = ? AND id_usuario = ?`,
        [this._idDireccion, this._idUsuario],
      );

      if (!affectedRows) {
        return { success: false, message: "Dirección no encontrada o sin permisos" };
      }

      return { success: true, message: "Dirección eliminada correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible eliminar la dirección" };
    }
  }
}