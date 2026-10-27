import { conexion } from "../conexion.ts";
import { generarCodigoEntrega } from "../../Helpers/codigoEntrega.ts";

interface ItemPedido {
  id_producto: number;
  cantidad: number;
  nombre: string;
  precio: number;
  reservado: number;
  stock_disponible: number;
}

export class PedidoCliente {
  static async CrearDesdeItems(
    id_cliente: number,
    id_empresa: number,
    id_direccion: number,
    itemsSolicitados: { id_producto: number; cantidad: number }[],
    metodo_pago: "online" | "contra_entrega",
    observaciones?: string,
  ) {
    if (!itemsSolicitados.length) {
      return { success: false, message: "El pedido no contiene productos" };
    }

    const itemsPorProducto = new Map<number, number>();
    for (const item of itemsSolicitados) {
      if (
        !Number.isSafeInteger(item.id_producto) || item.id_producto <= 0 ||
        !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0
      ) {
        return { success: false, message: "Los productos del pedido no son válidos" };
      }
      itemsPorProducto.set(
        item.id_producto,
        (itemsPorProducto.get(item.id_producto) ?? 0) + item.cantidad,
      );
    }

    const items = Array.from(itemsPorProducto, ([id_producto, cantidad]) => ({
      id_producto,
      cantidad,
    })).sort((a, b) => a.id_producto - b.id_producto);

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
        return {
          success: false,
          message: "La dirección no existe, no te pertenece o está inactiva",
        };
      }

      const [empresa] = await conexion.query(
        `SELECT id_empresa FROM empresas WHERE id_empresa = ? AND estado = 1`,
        [id_empresa],
      );
      if (!empresa) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "La empresa no está disponible" };
      }

      const productos = await conexion.query(
        `SELECT p.id_producto, p.id_empresa, p.nombre, p.precio, p.activo,
                c.activo AS categoria_activa, i.stock_disponible, i.stock_reservado
         FROM productos p
         INNER JOIN categorias c ON c.id_categoria = p.id_categoria
         INNER JOIN inventario i ON i.id_producto = p.id_producto
         WHERE p.id_producto IN (${items.map(() => "?").join(",")})
         ORDER BY p.id_producto ASC
         FOR UPDATE`,
        items.map((item) => item.id_producto),
      );

      if (productos.length !== items.length) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Uno o más productos ya no tienen inventario",
        };
      }

      const productosPorId = new Map<number, {
        id_producto: number;
        cantidad: number;
        nombre: string;
        precio: number;
        reservado: number;
      }>();
      for (const producto of productos) {
        if (
          Number(producto.id_empresa) !== id_empresa ||
          Number(producto.activo) !== 1 ||
          Number(producto.categoria_activa) !== 1
        ) {
          await conexion.execute("ROLLBACK");
          return {
            success: false,
            message: `El producto ${producto.nombre} ya no está disponible`,
          };
        }
        productosPorId.set(Number(producto.id_producto), {
          id_producto: Number(producto.id_producto),
          cantidad: 0,
          nombre: String(producto.nombre),
          precio: Number(producto.precio),
          reservado: Number(producto.stock_reservado),
        });
      }

      let totalCentavos = 0;
      for (const item of items) {
        const producto = productosPorId.get(item.id_producto);
        const filaInventario = productos.find(
          (fila: { id_producto: number }) =>
            Number(fila.id_producto) === item.id_producto,
        );
        if (!producto || !filaInventario) {
          throw new Error("No se pudo validar el inventario del pedido");
        }
        const disponible = Number(filaInventario.stock_disponible) -
          producto.reservado;
        if (item.cantidad > disponible) {
          await conexion.execute("ROLLBACK");
          return {
            success: false,
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${Math.max(0, disponible)}.`,
            id_producto: item.id_producto,
            stock_disponible: Math.max(0, disponible),
          };
        }
        producto.cantidad = item.cantidad;
        totalCentavos += Math.round(producto.precio * 100) * item.cantidad;
      }

      const [estado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = ?`,
        [metodo_pago === "online" ? "Pendiente" : "Aprobado"],
      );
      if (!estado) throw new Error("No existe el estado requerido para el pedido");

      const total = (totalCentavos + 800000) / 100;
      const codigoEntrega = metodo_pago === "contra_entrega"
        ? generarCodigoEntrega()
        : null;
      const pedidoResult = await conexion.execute(
        `INSERT INTO pedidos
           (id_empresa, id_cliente, id_direccion, id_estado, metodo_pago,
            total, fecha_pedido, fecha_aprobacion, observaciones, pago_confirmado,
            codigo_entrega)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                 IF(? = 'contra_entrega', CURRENT_TIMESTAMP, NULL), ?, 0, ?)`,
        [
          id_empresa,
          id_cliente,
          id_direccion,
          estado.id_estado,
          metodo_pago,
          total.toFixed(2),
          metodo_pago,
          observaciones ?? null,
          codigoEntrega,
        ],
      );
      const id_pedido = Number(pedidoResult.lastInsertId);

      for (const producto of productosPorId.values()) {
        await conexion.execute(
          `INSERT INTO detalle_pedido
             (id_pedido, id_producto, cantidad, precio_unitario)
           VALUES (?, ?, ?, ?)`,
          [
            id_pedido,
            producto.id_producto,
            producto.cantidad,
            producto.precio.toFixed(2),
          ],
        );
        const reservadoNuevo = producto.reservado + producto.cantidad;
        await conexion.execute(
          `UPDATE inventario SET stock_reservado = ?,
             ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [reservadoNuevo, producto.id_producto],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
             (id_producto, id_usuario, tipo_movimiento, cantidad,
              stock_anterior, stock_nuevo, motivo, fecha)
           VALUES (?, ?, 'reserva', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            producto.id_producto,
            id_cliente,
            producto.cantidad,
            producto.reservado,
            reservadoNuevo,
            `Reserva por pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute(
        `INSERT INTO pagos (id_pedido, pasarela, monto, estado_pago)
         VALUES (?, ?, ?, 'pendiente')`,
        [id_pedido, metodo_pago === "online" ? "wompi" : null, total.toFixed(2)],
      );
      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Pedido creado correctamente",
        id_pedido,
        total,
        metodo_pago,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Crear pedido desde artículos:", error);
      throw error;
    }
  }

  static async Listar(id_cliente: number) {
    return await conexion.query(
      `SELECT p.id_pedido, p.id_empresa, e.nombre AS nombre_empresa,
              e.logo_url AS empresa_logo,
              p.total, p.metodo_pago, p.pago_confirmado, p.fecha_pedido,
              p.fecha_asignacion, p.fecha_inicio_transito, p.fecha_entrega,
              ep.nombre_estado AS estado, d.alias, d.direccion_texto,
              (SELECT COALESCE(SUM(dp.cantidad), 0)
               FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items,
              (SELECT GROUP_CONCAT(CONCAT(dp.cantidad, ' x ', pr.nombre)
                 ORDER BY pr.nombre SEPARATOR ', ')
               FROM detalle_pedido dp
               INNER JOIN productos pr ON pr.id_producto = dp.id_producto
               WHERE dp.id_pedido = p.id_pedido) AS productos_lista
       FROM pedidos p
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       WHERE p.id_cliente = ?
       ORDER BY p.fecha_pedido DESC`,
      [id_cliente],
    );
  }

  static async Obtener(id_cliente: number, id_pedido: number) {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, p.id_empresa, e.nombre AS nombre_empresa,
              e.logo_url AS empresa_logo,
              p.total, p.metodo_pago, p.pago_confirmado, p.observaciones,
              p.fecha_pedido, p.fecha_aprobacion, p.fecha_asignacion,
              p.fecha_inicio_transito, p.fecha_entrega,
              ep.nombre_estado AS estado, d.alias, d.direccion_texto,
              d.latitud, d.longitud, p.codigo_entrega,
              pr.nombre AS nombre_proveedor, pr.apellido AS apellido_proveedor,
              pg.estado_pago, pg.pasarela, pg.fecha_pago
       FROM pedidos p
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
       LEFT JOIN usuarios pr ON pr.id_usuario = ap.id_proveedor
       LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
       WHERE p.id_pedido = ? AND p.id_cliente = ?`,
      [id_pedido, id_cliente],
    );
    if (!pedido) return null;

    const productos = await conexion.query(
      `SELECT dp.id_producto, p.nombre, dp.cantidad, dp.precio_unitario,
              (dp.cantidad * dp.precio_unitario) AS subtotal,
              c.nombre AS categoria,
              (SELECT pi.url FROM producto_imagenes pi
               WHERE pi.id_producto = p.id_producto
               ORDER BY pi.orden ASC LIMIT 1) AS imagenUrl
       FROM detalle_pedido dp
       INNER JOIN productos p ON p.id_producto = dp.id_producto
       INNER JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE dp.id_pedido = ?`,
      [id_pedido],
    );
    return { ...pedido, productos };
  }

  static async CrearDesdeCarrito(
    id_cliente: number,
    id_direccion: number,
    observaciones?: string,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [carrito] = await conexion.query(
        `SELECT id_carrito, id_empresa FROM carritos
         WHERE id_cliente = ? FOR UPDATE`,
        [id_cliente],
      );
      if (!carrito?.id_empresa) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "El carrito está vacío" };
      }

      const [direccion] = await conexion.query(
        `SELECT id_direccion FROM direcciones
         WHERE id_direccion = ? AND id_usuario = ? AND activo = 1
         FOR UPDATE`,
        [id_direccion, id_cliente],
      );
      if (!direccion) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "La dirección no existe, no te pertenece o está inactiva",
        };
      }

      const items = await conexion.query(
        `SELECT ci.id_producto, ci.cantidad
         FROM carrito_items ci
         WHERE ci.id_carrito = ?
         ORDER BY ci.id_producto ASC
         FOR UPDATE`,
        [carrito.id_carrito],
      );
      if (items.length === 0) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "El carrito está vacío" };
      }

      const productos = await conexion.query(
        `SELECT p.id_producto, p.id_empresa, p.nombre, p.precio, p.activo,
                c.activo AS categoria_activa, e.estado AS empresa_activa,
                i.stock_disponible, i.stock_reservado
         FROM productos p
         INNER JOIN categorias c ON c.id_categoria = p.id_categoria
         INNER JOIN empresas e ON e.id_empresa = p.id_empresa
         INNER JOIN inventario i ON i.id_producto = p.id_producto
         WHERE p.id_producto IN (${items.map(() => "?").join(",")})
         ORDER BY p.id_producto ASC
         FOR UPDATE`,
        items.map((item: { id_producto: number }) => item.id_producto),
      );

      if (productos.length !== items.length) {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message: "Uno o más productos ya no tienen inventario",
        };
      }
      const productosPorId = new Map<number, ItemPedido>();
      for (const producto of productos) {
        if (
          Number(producto.id_empresa) !== Number(carrito.id_empresa) ||
          Number(producto.activo) === 0 ||
          Number(producto.categoria_activa) === 0 ||
          Number(producto.empresa_activa) === 0
        ) {
          await conexion.execute("ROLLBACK");
          return {
            success: false,
            message: `El producto ${producto.nombre} ya no está disponible`,
          };
        }
        productosPorId.set(Number(producto.id_producto), {
          id_producto: Number(producto.id_producto),
          cantidad: 0,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          reservado: Number(producto.stock_reservado),
          stock_disponible: Number(producto.stock_disponible),
        });
      }

      let totalCentavos = 0;
      for (const item of items) {
        const producto = productosPorId.get(Number(item.id_producto));
        if (!producto) {
          await conexion.execute("ROLLBACK");
          return { success: false, message: "Producto no encontrado" };
        }
        const disponible = producto.stock_disponible - producto.reservado;
        if (Number(item.cantidad) > disponible) {
          await conexion.execute("ROLLBACK");
          return {
            success: false,
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${
              Math.max(0, disponible)
            }.`,
            id_producto: Number(item.id_producto),
            stock_disponible: Math.max(0, disponible),
          };
        }
        producto.cantidad = Number(item.cantidad);
        totalCentavos += Math.round(producto.precio * 100) * producto.cantidad;
      }

      const [estadoAprobado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Aprobado'`,
      );
      if (!estadoAprobado) {
        throw new Error("No existe el estado de pedido Aprobado");
      }
      const total = totalCentavos / 100;
      const codigoEntrega = generarCodigoEntrega();
      const pedidoResult = await conexion.execute(
        `INSERT INTO pedidos
           (id_empresa, id_cliente, id_direccion, id_estado, metodo_pago,
            total, fecha_pedido, fecha_aprobacion, observaciones, pago_confirmado,
            codigo_entrega)
         VALUES (?, ?, ?, ?, 'contra_entrega', ?, CURRENT_TIMESTAMP,
                 CURRENT_TIMESTAMP, ?, 0, ?)`,
        [
          carrito.id_empresa,
          id_cliente,
          id_direccion,
          estadoAprobado.id_estado,
          total.toFixed(2),
          observaciones ?? null,
          codigoEntrega,
        ],
      );
      const id_pedido = pedidoResult.lastInsertId as number;

      for (const producto of productosPorId.values()) {
        await conexion.execute(
          `INSERT INTO detalle_pedido
             (id_pedido, id_producto, cantidad, precio_unitario)
           VALUES (?, ?, ?, ?)`,
          [
            id_pedido,
            producto.id_producto,
            producto.cantidad,
            producto.precio.toFixed(2),
          ],
        );
        const reservadoNuevo = producto.reservado + producto.cantidad;
        await conexion.execute(
          `UPDATE inventario SET stock_reservado = ?,
             ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [reservadoNuevo, producto.id_producto],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
             (id_producto, id_usuario, tipo_movimiento, cantidad,
              stock_anterior, stock_nuevo, motivo, fecha)
           VALUES (?, ?, 'reserva', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            producto.id_producto,
            id_cliente,
            producto.cantidad,
            producto.reservado,
            reservadoNuevo,
            `Reserva por pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute(
        `INSERT INTO pagos (id_pedido, monto, estado_pago)
         VALUES (?, ?, 'pendiente')`,
        [id_pedido, total.toFixed(2)],
      );
      await conexion.execute(
        `DELETE FROM carrito_items WHERE id_carrito = ?`,
        [carrito.id_carrito],
      );
      await conexion.execute(
        `UPDATE carritos SET id_empresa = NULL WHERE id_carrito = ?`,
        [carrito.id_carrito],
      );
      await conexion.execute("COMMIT");
      return {
        success: true,
        message: "Pedido creado correctamente",
        id_pedido,
        total,
        metodo_pago: "contra_entrega",
        codigo_entrega: codigoEntrega,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Crear pedido de cliente:", error);
      throw error;
    }
  }

  static async Cancelar(
    id_cliente: number,
    id_pedido: number,
    motivo?: string,
  ) {
    try {
      await conexion.execute("START TRANSACTION");
      const [pedido] = await conexion.query(
        `SELECT p.id_pedido, p.observaciones, ep.nombre_estado
         FROM pedidos p
         INNER JOIN estados_pedido ep ON ep.id_estado = p.id_estado
         WHERE p.id_pedido = ? AND p.id_cliente = ?
         FOR UPDATE`,
        [id_pedido, id_cliente],
      );
      if (!pedido) {
        await conexion.execute("ROLLBACK");
        return { success: false, message: "Pedido no encontrado" };
      }
      if (pedido.nombre_estado !== "Aprobado") {
        await conexion.execute("ROLLBACK");
        return {
          success: false,
          message:
            "Solo puedes cancelar pedidos que aún no tengan proveedor asignado",
        };
      }

      const [estadoCancelado] = await conexion.query(
        `SELECT id_estado FROM estados_pedido WHERE nombre_estado = 'Cancelado'`,
      );
      if (!estadoCancelado) {
        throw new Error("No existe el estado de pedido Cancelado");
      }
      const items = await conexion.query(
        `SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?`,
        [id_pedido],
      );

      const observaciones = motivo
        ? `${pedido.observaciones ?? ""} | Cancelado por cliente: ${motivo}`
          .trim()
        : pedido.observaciones;
      await conexion.execute(
        `UPDATE pedidos SET id_estado = ?, observaciones = ? WHERE id_pedido = ?`,
        [estadoCancelado.id_estado, observaciones, id_pedido],
      );
      await conexion.execute(
        `UPDATE pagos SET estado_pago = 'cancelado' WHERE id_pedido = ?`,
        [id_pedido],
      );

      for (const item of items) {
        const [inventario] = await conexion.query(
          `SELECT stock_reservado FROM inventario
           WHERE id_producto = ? FOR UPDATE`,
          [item.id_producto],
        );
        if (
          !inventario ||
          Number(inventario.stock_reservado) < Number(item.cantidad)
        ) {
          throw new Error(
            `La reserva de inventario del producto ${item.id_producto} es inconsistente`,
          );
        }
        const reservadoAnterior = Number(inventario.stock_reservado);
        const reservadoNuevo = reservadoAnterior - Number(item.cantidad);
        await conexion.execute(
          `UPDATE inventario SET stock_reservado = ?,
             ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE id_producto = ?`,
          [reservadoNuevo, item.id_producto],
        );
        await conexion.execute(
          `INSERT INTO movimientos_inventario
             (id_producto, id_usuario, tipo_movimiento, cantidad,
              stock_anterior, stock_nuevo, motivo, fecha)
           VALUES (?, ?, 'liberacion', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            item.id_producto,
            id_cliente,
            item.cantidad,
            reservadoAnterior,
            reservadoNuevo,
            `Liberación por cancelación del pedido #${id_pedido}`,
          ],
        );
      }

      await conexion.execute("COMMIT");
      return { success: true, message: "Pedido cancelado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error Cancelar pedido de cliente:", error);
      throw error;
    }
  }
}
