import { conexion } from "./Conexion.ts";

const ID_ROL_PROVEEDOR = 3;

interface MetricasInicioRow {
  productos: number;
  pendientes: number;
  enTransito: number;
  repartidores: number;
}

export class Dashboard {
  public _idEmpresa: number | null;

  constructor(idEmpresa: number | null = null) {
    this._idEmpresa = idEmpresa;
  }

  // metricas resumidas para la pantalla de inicio del admin
  public async ObtenerMetricasInicio(): Promise<{
    success: boolean;
    message: string;
    data?: Record<string, number>;
  }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT
           (SELECT COUNT(*) FROM productos WHERE id_empresa = ? AND activo = 1) AS productos,
           (SELECT COUNT(*) FROM pedidos p
            INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
            WHERE p.id_empresa = ? AND ep.nombre_estado = 'Pendiente') AS pendientes,
           (SELECT COUNT(*) FROM pedidos p
            INNER JOIN estados_pedido ep ON p.id_estado = ep.id_estado
            WHERE p.id_empresa = ? AND ep.nombre_estado IN ('En transito', 'En tránsito')) AS enTransito,
           (SELECT COUNT(*) FROM usuarios WHERE id_empresa = ? AND id_rol = ? AND activo = 1) AS repartidores`,
        [this._idEmpresa, this._idEmpresa, this._idEmpresa, this._idEmpresa, ID_ROL_PROVEEDOR],
      );

      const fila = rows?.[0] as MetricasInicioRow;

      return {
        success: true,
        message: "Métricas obtenidas",
        data: {
          productos: fila?.productos ?? 0,
          pendientes: fila?.pendientes ?? 0,
          enTransito: fila?.enTransito ?? 0,
          repartidores: fila?.repartidores ?? 0,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las métricas" };
    }
  }
}