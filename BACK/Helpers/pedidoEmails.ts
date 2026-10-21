import { conexion } from "../Model/conexion.ts";
import { enviarCorreo } from "./mailer.ts";
import {
  PedidoCorreoDatos,
  plantillaAsignacionPedidoCliente,
  plantillaCancelacionPedidoCliente,
  plantillaConfirmacionPedidoCliente,
  plantillaEstadoPedidoCliente,
} from "./emailTemplates.ts";

export type EventoCorreoPedido =
  | "confirmado"
  | "cancelado"
  | "asignado"
  | "En transito"
  | "Entregado";

export async function notificarClienteCambioPedido(
  id_pedido: number,
  evento: EventoCorreoPedido,
  motivo?: string,
): Promise<void> {
  try {
    const [pedido] = await conexion.query(
      `SELECT p.id_pedido, p.total, p.metodo_pago,
              c.nombre AS nombre_cliente, c.email,
              e.nombre AS nombre_empresa, d.direccion_texto,
              CONCAT(pr.nombre, ' ', pr.apellido) AS nombre_proveedor
       FROM pedidos p
       INNER JOIN usuarios c ON c.id_usuario = p.id_cliente
       INNER JOIN empresas e ON e.id_empresa = p.id_empresa
       INNER JOIN direcciones d ON d.id_direccion = p.id_direccion
       LEFT JOIN asignacion_pedido ap ON ap.id_pedido = p.id_pedido
       LEFT JOIN usuarios pr ON pr.id_usuario = ap.id_proveedor
       WHERE p.id_pedido = ?`,
      [id_pedido],
    );
    if (!pedido) {
      console.error(
        `No se pudo preparar el correo del pedido #${id_pedido}: pedido inexistente`,
      );
      return;
    }

    const productos = await conexion.query(
      `SELECT p.nombre, dp.cantidad, dp.precio_unitario,
              (dp.cantidad * dp.precio_unitario) AS subtotal
       FROM detalle_pedido dp
       INNER JOIN productos p ON p.id_producto = dp.id_producto
       WHERE dp.id_pedido = ?
       ORDER BY dp.id_detalle`,
      [id_pedido],
    );
    const datos: PedidoCorreoDatos = {
      id_pedido: Number(pedido.id_pedido),
      nombre_cliente: pedido.nombre_cliente,
      nombre_empresa: pedido.nombre_empresa,
      total: Number(pedido.total),
      metodo_pago: pedido.metodo_pago,
      direccion_texto: pedido.direccion_texto,
      nombre_proveedor: pedido.nombre_proveedor ?? undefined,
      productos: productos.map((producto: {
        nombre: string;
        cantidad: number | string;
        precio_unitario: number | string;
        subtotal: number | string;
      }) => ({
        nombre: producto.nombre,
        cantidad: Number(producto.cantidad),
        precio_unitario: Number(producto.precio_unitario),
        subtotal: Number(producto.subtotal),
      })),
    };

    const correo = evento === "confirmado"
      ? plantillaConfirmacionPedidoCliente(datos)
      : evento === "cancelado"
      ? plantillaCancelacionPedidoCliente(datos, motivo)
      : evento === "asignado"
      ? plantillaAsignacionPedidoCliente(datos)
      : plantillaEstadoPedidoCliente(datos, evento);

    await enviarCorreo(pedido.email, correo.asunto, correo.html, correo.texto);
  } catch (error) {
    console.error(
      `El pedido #${id_pedido} se procesó, pero no se pudo preparar su correo de ${evento}:`,
      error,
    );
  }
}
