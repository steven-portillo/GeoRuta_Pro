import { conexion } from "./Conexion.ts";

interface NotificacionRow {
  id_notificacion: number;
  mensaje: string;
  leida: number;
  fecha_hora: Date;
}

export class Notificacion {
  public _idUsuario: number | null;

  constructor(idUsuario: number | null = null) {
    this._idUsuario = idUsuario;
  }

  // trae las ultimas 10 notificaciones del usuario, mas cuantas no ha leido
  public async ObtenerRecientes(): Promise<{
    success: boolean;
    message: string;
    data?: unknown[];
    noLeidas?: number;
  }> {
    if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

    try {
      const { rows } = await conexion.execute(
        `SELECT id_notificacion, mensaje, leida, fecha_hora
         FROM notificaciones
         WHERE id_usuario = ?
         ORDER BY fecha_hora DESC
         LIMIT 10`,
        [this._idUsuario],
      );

      const notificaciones = (rows as NotificacionRow[]).map((fila) => ({
        id: fila.id_notificacion,
        mensaje: fila.mensaje,
        leida: Boolean(fila.leida),
        fecha: fila.fecha_hora,
      }));

      const noLeidas = notificaciones.filter((n) => !n.leida).length;

      return { success: true, message: "Notificaciones obtenidas", data: notificaciones, noLeidas };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las notificaciones" };
    }
  }

  public async MarcarTodasLeidas(): Promise<{ success: boolean; message: string }> {
    if (!this._idUsuario) return { success: false, message: "Usuario no identificado" };

    try {
      await conexion.execute(`UPDATE notificaciones SET leida = 1 WHERE id_usuario = ?`, [this._idUsuario]);
      return { success: true, message: "Notificaciones marcadas como leídas" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible marcar las notificaciones" };
    }
  }
}