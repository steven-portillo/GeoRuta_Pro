import { conexion } from "./Conexion.ts";

interface MetricasPagosRow {
  saldoTotal: number;
  pagosMes: number;
  pagosPendientes: number;
  ticketPromedio: number;
  totalAprobados: number;
  totalRechazados: number;
}

interface PagoListRow {
  id_pago: number;
  id_pedido: number;
  pasarela: string | null;
  referencia_ext: string | null;
  monto: number;
  estado_pago: string;
  fecha_pago: Date | null;
  cliente: string;
  metodo_pago: string;
}

interface SerieDiariaRow {
  dia: string;
  total: number;
}

const DIAS_SERIE = 14;

export class Pago {
  public _idEmpresa: number | null;

  constructor(idEmpresa: number | null = null) {
    this._idEmpresa = idEmpresa;
  }

  // metricas generales de pagos: saldo total aprobado, pagos del mes, pendientes, ticket promedio, etc.
  public async ObtenerMetricas(): Promise<{
    success: boolean;
    message: string;
    data?: Record<string, number>;
  }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT
           IFNULL(SUM(CASE WHEN pg.estado_pago = 'aprobado' THEN pg.monto ELSE 0 END), 0) AS saldoTotal,
           IFNULL(SUM(CASE WHEN pg.estado_pago = 'aprobado'
                        AND MONTH(pg.fecha_pago) = MONTH(CURDATE())
                        AND YEAR(pg.fecha_pago) = YEAR(CURDATE())
                        THEN pg.monto ELSE 0 END), 0) AS pagosMes,
           IFNULL(SUM(CASE WHEN pg.estado_pago = 'pendiente' THEN 1 ELSE 0 END), 0) AS pagosPendientes,
           IFNULL(AVG(CASE WHEN pg.estado_pago = 'aprobado' THEN pg.monto END), 0) AS ticketPromedio,
           IFNULL(SUM(CASE WHEN pg.estado_pago = 'aprobado' THEN 1 ELSE 0 END), 0) AS totalAprobados,
           IFNULL(SUM(CASE WHEN pg.estado_pago = 'rechazado' THEN 1 ELSE 0 END), 0) AS totalRechazados
         FROM pagos pg
         INNER JOIN pedidos p ON pg.id_pedido = p.id_pedido
         WHERE p.id_empresa = ?`,
        [this._idEmpresa],
      );

      const fila = rows?.[0] as MetricasPagosRow;

      return {
        success: true,
        message: "Métricas obtenidas",
        data: {
          saldoTotal: fila?.saldoTotal ?? 0,
          pagosMes: fila?.pagosMes ?? 0,
          pagosPendientes: fila?.pagosPendientes ?? 0,
          ticketPromedio: fila?.ticketPromedio ?? 0,
          totalAprobados: fila?.totalAprobados ?? 0,
          totalRechazados: fila?.totalRechazados ?? 0,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las métricas de pagos" };
    }
  }

    // ════════════════════ FLUJO DE PAGO (CLIENTE) ════════════════════

  // valida que el pedido sea del cliente y no este pagado; devuelve el total en COP
  public async ObtenerPedidoPendiente(
    idPedido: number,
    idCliente: number,
  ): Promise<{ success: boolean; message: string; data?: { total: number } }> {
    try {
      const { rows } = await conexion.execute(
        `SELECT total FROM pedidos WHERE id_pedido = ? AND id_cliente = ? AND pago_confirmado = 0`,
        [idPedido, idCliente],
      );

      if (!rows || rows.length === 0) {
        return { success: false, message: "Pedido no encontrado o ya pagado" };
      }

      return {
        success: true,
        message: "Pedido encontrado",
        data: { total: (rows[0] as { total: number }).total },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible consultar el pedido" };
    }
  }

  // guarda la referencia del PaymentIntent apenas se crea, antes de que el cliente pague
  public async GuardarReferenciaStripe(
    idPedido: number,
    referenciaExt: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.execute(
        `UPDATE pagos SET referencia_ext = ?, pasarela = 'stripe' WHERE id_pedido = ?`,
        [referenciaExt, idPedido],
      );
      return { success: true, message: "Referencia guardada" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible guardar la referencia de pago" };
    }
  }

  // referencia guardada de un pedido, para revalidar su estado contra Stripe en /pago/exito
  public async ObtenerReferenciaPago(
    idPedido: number,
  ): Promise<{ success: boolean; message: string; data?: string }> {
    try {
      const { rows } = await conexion.execute(`SELECT referencia_ext FROM pagos WHERE id_pedido = ?`, [idPedido]);
      const referencia = (rows?.[0] as { referencia_ext: string | null })?.referencia_ext;

      if (!referencia) return { success: false, message: "Sin referencia de pago" };
      return { success: true, message: "Referencia obtenida", data: referencia };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener la referencia de pago" };
    }
  }

  // aprueba el pago: pedido pasa a pagado + "En preparacion", pago pasa a "aprobado" — todo en una transaccion
  public async MarcarAprobado(idPedido: number, paymentId: string): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.transaction(async (conn) => {
        await conn.execute(
          `UPDATE pedidos
           SET pago_confirmado = 1,
               id_estado = (SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'En preparacion')
           WHERE id_pedido = ? AND pago_confirmado = 0`,
          [idPedido],
        );

        await conn.execute(
          `UPDATE pagos SET estado_pago = 'aprobado', referencia_ext = ?, fecha_pago = NOW() WHERE id_pedido = ?`,
          [paymentId, idPedido],
        );
      });

      return { success: true, message: "Pago aprobado" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible marcar el pago como aprobado" };
    }
  }

  // datos del pedido necesarios para armar el recibo por email
  public async ObtenerDatosParaRecibo(idPedido: number): Promise<{
    success: boolean;
    message: string;
    data?: {
      email: string; nombre: string; empresa: string; direccion: string;
      total: number; fecha: Date;
      items: { producto: string; cantidad: number; precioUnitario: number }[];
    };
  }> {
    try {
      const { rows: cabeceraRows } = await conexion.execute(
        `SELECT u.email, u.nombre, u.apellido, e.nombre AS empresa,
                d.direccion_texto AS direccion, p.total, p.fecha_pedido
         FROM pedidos p
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         INNER JOIN empresas e ON p.id_empresa = e.id_empresa
         LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
         WHERE p.id_pedido = ?`,
        [idPedido],
      );

      if (!cabeceraRows || cabeceraRows.length === 0) {
        return { success: false, message: "Pedido no encontrado" };
      }

      const fila = cabeceraRows[0] as Record<string, unknown>;

      const { rows: itemsRows } = await conexion.execute(
        `SELECT pr.nombre, dp.cantidad, dp.precio_unitario
         FROM detalle_pedido dp
         INNER JOIN productos pr ON dp.id_producto = pr.id_producto
         WHERE dp.id_pedido = ?`,
        [idPedido],
      );

      const items = (itemsRows as Record<string, unknown>[]).map((f) => ({
        producto: f.nombre as string,
        cantidad: f.cantidad as number,
        precioUnitario: f.precio_unitario as number,
      }));

      return {
        success: true,
        message: "Datos obtenidos",
        data: {
          email: fila.email as string,
          nombre: `${fila.nombre} ${fila.apellido}`,
          empresa: fila.empresa as string,
          direccion: (fila.direccion as string) ?? "No especificada",
          total: fila.total as number,
          fecha: fila.fecha_pedido as Date,
          items,
        },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los datos del recibo" };
    }
  }

  // listado de pagos de la empresa, mas reciente primero (los sin fecha de pago al final)
  public async ObtenerListado(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT pg.id_pago, pg.id_pedido, pg.pasarela, pg.referencia_ext, pg.monto,
                pg.estado_pago, pg.fecha_pago, CONCAT(u.nombre, ' ', u.apellido) AS cliente,
                p.metodo_pago
         FROM pagos pg
         INNER JOIN pedidos p ON pg.id_pedido = p.id_pedido
         INNER JOIN usuarios u ON p.id_cliente = u.id_usuario
         WHERE p.id_empresa = ?
         ORDER BY IFNULL(pg.fecha_pago, '1900-01-01') DESC, pg.id_pago DESC`,
        [this._idEmpresa],
      );

      const pagos = (rows as PagoListRow[]).map((fila) => ({
        id: fila.id_pago,
        idPedido: fila.id_pedido,
        cliente: fila.cliente,
        pasarela: fila.pasarela ?? "",
        referencia: fila.referencia_ext ?? "",
        monto: fila.monto,
        estadoPago: fila.estado_pago,
        metodoPago: fila.metodo_pago,
        fecha: fila.fecha_pago,
      }));

      return { success: true, message: "Pagos obtenidos", data: pagos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los pagos" };
    }
  }

  // serie de ingresos aprobados de los ultimos 14 dias, rellenando con 0 los dias sin ventas
  public async ObtenerSerieDiaria(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT DATE(pg.fecha_pago) AS dia, SUM(pg.monto) AS total
         FROM pagos pg
         INNER JOIN pedidos p ON pg.id_pedido = p.id_pedido
         WHERE p.id_empresa = ?
           AND pg.estado_pago = 'aprobado'
           AND pg.fecha_pago >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(pg.fecha_pago)
         ORDER BY dia`,
        [this._idEmpresa, DIAS_SERIE - 1],
      );

      const ingresosPorDia = new Map<string, number>();
      for (const fila of rows as SerieDiariaRow[]) {
        const clave = new Date(fila.dia).toISOString().slice(0, 10);
        ingresosPorDia.set(clave, fila.total);
      }

      const serie = [];
      for (let i = DIAS_SERIE - 1; i >= 0; i--) {
        const dia = new Date();
        dia.setDate(dia.getDate() - i);
        const clave = dia.toISOString().slice(0, 10);
        serie.push({ fecha: clave, total: ingresosPorDia.get(clave) ?? 0 });
      }

      return { success: true, message: "Serie diaria obtenida", data: serie };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener la serie de ingresos" };
    }
  }
}