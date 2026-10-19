import { conexion } from "../conexion.ts";

export interface DireccionData {
  alias?: string | null;
  direccion_texto: string;
  latitud?: number | null;
  longitud?: number | null;
}

export class DireccionCliente {
  static async Listar(id_cliente: number) {
    return await conexion.query(
      `SELECT id_direccion, NULL AS alias, direccion_texto, latitud, longitud, activo
       FROM direcciones
       WHERE id_usuario = ?
       ORDER BY activo DESC, id_direccion DESC`,
      [id_cliente],
    );
  }

  static async Crear(id_cliente: number, datos: DireccionData) {
    const result = await conexion.execute(
      `INSERT INTO direcciones (id_usuario, direccion_texto, latitud, longitud, activo)
       VALUES (?, ?, ?, ?, 1)`,
      [
        id_cliente,
        datos.direccion_texto,
        datos.latitud ?? null,
        datos.longitud ?? null,
      ],
    );
    return { id: result.lastInsertId as number };
  }

  static async Editar(
    id_cliente: number,
    id_direccion: number,
    datos: DireccionData,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [direccion] = await conexion.query(
        `SELECT id_direccion FROM direcciones
         WHERE id_direccion = ? AND id_usuario = ? AND activo = 1
         FOR UPDATE`,
        [id_direccion, id_cliente],
      );
      if (!direccion) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Dirección no encontrada" };
      }

      const [pedido] = await conexion.query(
        `SELECT id_pedido FROM pedidos WHERE id_direccion = ? LIMIT 1`,
        [id_direccion],
      );

      if (pedido) {
        const result = await conexion.execute(
          `INSERT INTO direcciones (id_usuario, direccion_texto, latitud, longitud, activo)
           SELECT id_usuario, ?, ?, ?, 1
           FROM direcciones WHERE id_direccion = ? AND id_usuario = ?`,
          [
            datos.direccion_texto,
            datos.latitud ?? null,
            datos.longitud ?? null,
            id_direccion,
            id_cliente,
          ],
        );
        await conexion.execute(
          `UPDATE direcciones SET activo = 0 WHERE id_direccion = ? AND id_usuario = ?`,
          [id_direccion, id_cliente],
        );
        await conexion.execute("COMMIT");
        return {
          success: true,
          message:
            "Dirección actualizada; se creó una nueva para preservar pedidos anteriores",
          id: result.lastInsertId as number,
          direccion_reemplazada: id_direccion,
        };
      }

      await conexion.execute(
        `UPDATE direcciones
         SET direccion_texto = ?, latitud = ?, longitud = ?
         WHERE id_direccion = ? AND id_usuario = ?`,
        [
          datos.direccion_texto,
          datos.latitud ?? null,
          datos.longitud ?? null,
          id_direccion,
          id_cliente,
        ],
      );
      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Dirección actualizada correctamente",
        id: id_direccion,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Editar dirección de cliente:", error);
      throw error;
    }
  }

  static async CambiarEstado(
    id_cliente: number,
    id_direccion: number,
    activo: 0 | 1,
  ) {
    const result = await conexion.execute(
      `UPDATE direcciones SET activo = ?
       WHERE id_direccion = ? AND id_usuario = ?`,
      [activo, id_direccion, id_cliente],
    );
    return Number(result.affectedRows ?? 0) > 0;
  }
}
