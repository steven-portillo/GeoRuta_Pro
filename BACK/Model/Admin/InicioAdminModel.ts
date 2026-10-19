import { conexion } from "../conexion.ts";

export class InicioAdmin {
  static async ObtenerMetricas(id_empresa: number) {
    const [metricas] = await conexion.query(
      `SELECT
         (SELECT COUNT(*) FROM productos
          WHERE id_empresa = ? AND activo = 1) AS productos,
         (SELECT COUNT(*) FROM pedidos p
          INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
          WHERE p.id_empresa = ? AND ep.nombre_estado = 'Pendiente') AS pendientes,
         (SELECT COUNT(*) FROM pedidos p
          INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
          WHERE p.id_empresa = ?
            AND REPLACE(LOWER(ep.nombre_estado), 'á', 'a') = 'en transito') AS enTransito,
         (SELECT COUNT(*) FROM usuarios
          WHERE id_empresa = ? AND id_rol = 3 AND activo = 1) AS repartidores`,
      [id_empresa, id_empresa, id_empresa, id_empresa],
    );
    return {
      productos: Number(metricas?.productos ?? 0),
      pendientes: Number(metricas?.pendientes ?? 0),
      enTransito: Number(metricas?.enTransito ?? 0),
      repartidores: Number(metricas?.repartidores ?? 0),
    };
  }
}
