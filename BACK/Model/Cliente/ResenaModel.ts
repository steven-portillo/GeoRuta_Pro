import { conexion } from "../conexion.ts";

interface ResenaData {
  calificacion?: number;
  comentario?: string | null;
}

export class ResenaCliente {
  static async Crear(
    id_cliente: number,
    id_pedido: number,
    id_producto: number,
    calificacion: number,
    comentario?: string,
  ) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido
       FROM pedidos p
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       WHERE p.id_pedido = ? AND p.id_cliente = ?
         AND dp.id_producto = ? AND ep.nombre_estado = 'Entregado'`,
      [id_pedido, id_cliente, id_producto],
    );
    if (!pedido) {
      return {
        success: false,
        message: "Solo puedes reseñar productos de tus pedidos entregados",
      };
    }
    const [existente] = await conexion.query(
      `SELECT id_resena FROM resenas
       WHERE id_pedido = ? AND id_producto = ?`,
      [id_pedido, id_producto],
    );
    if (existente) {
      return {
        success: false,
        message: "Ya existe una reseña para este producto y pedido",
      };
    }

    await conexion.execute(
      `INSERT INTO resenas
         (id_pedido, id_cliente, id_producto, calificacion, comentario, fecha, activo)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
      [id_pedido, id_cliente, id_producto, calificacion, comentario ?? null],
    );
    return { success: true, message: "Reseña creada correctamente" };
  }

  static async Editar(
    id_cliente: number,
    id_resena: number,
    datos: ResenaData,
  ) {
    const [resena] = await conexion.query(
      `SELECT id_resena FROM resenas
       WHERE id_resena = ? AND id_cliente = ?`,
      [id_resena, id_cliente],
    );
    if (!resena) return { success: false, message: "Reseña no encontrada" };

    const campos: string[] = [];
    const valores: unknown[] = [];
    if (datos.calificacion !== undefined) {
      campos.push("calificacion = ?");
      valores.push(datos.calificacion);
    }
    if (datos.comentario !== undefined) {
      campos.push("comentario = ?");
      valores.push(datos.comentario);
    }
    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }
    valores.push(id_resena, id_cliente);
    await conexion.execute(
      `UPDATE resenas SET ${campos.join(", ")}
       WHERE id_resena = ? AND id_cliente = ?`,
      valores,
    );
    return { success: true, message: "Reseña actualizada correctamente" };
  }

  static async Desactivar(id_cliente: number, id_resena: number) {
    const result = await conexion.execute(
      `UPDATE resenas SET activo = 0
       WHERE id_resena = ? AND id_cliente = ? AND activo = 1`,
      [id_resena, id_cliente],
    );
    return Number(result.affectedRows ?? 0) > 0;
  }
}
