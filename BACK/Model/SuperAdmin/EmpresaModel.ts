import { conexion } from "../conexion.ts";

const ID_ROL_ADMIN = 2;

export class Empresa {
  static async Listar() {
    return await conexion.query(
      `SELECT
        e.id_empresa, e.nombre, e.logo_url, e.descripcion, e.estado, e.fecha_creacion,
        u.id_usuario AS id_admin, u.nombre AS nombre_admin, u.apellido AS apellido_admin, u.email AS email_admin
      FROM empresas e
      INNER JOIN usuarios u ON u.id_empresa = e.id_empresa AND u.id_rol = ${ID_ROL_ADMIN}
      ORDER BY e.fecha_creacion DESC`,
    );
  }

  static async CambiarEstado(id_empresa: number, nuevoEstado: 0 | 1) {
    try {
      await conexion.execute("START TRANSACTION");

      await conexion.execute(
        `UPDATE empresas SET estado = ? WHERE id_empresa = ?`,
        [nuevoEstado, id_empresa],
      );

      await conexion.execute(
        `UPDATE usuarios SET activo = ? WHERE id_empresa = ? AND id_rol = ?`,
        [nuevoEstado, id_empresa, ID_ROL_ADMIN],
      );

      await conexion.execute("COMMIT");
      return { success: true, message: "Estado actualizado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error CambiarEstado empresa:", error);
      return { success: false, message: "Error al cambiar el estado" };
    }
  }
}
