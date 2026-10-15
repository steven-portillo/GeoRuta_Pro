import { Context } from "../../Dependencies/dependencias.ts";
import { generarFirmaIntegridad, getWompiPublicKey } from "../../Helpers/wompi.ts";
import { Producto } from "../../Model/Admin/ProductoModel.ts"; 
import { PagoModel } from "../../Model/Pagos/pagosModel.ts";

const ID_USUARIO_PRUEBA = 1;
const ID_DIRECCION_PRUEBA = 1;

export const crearCheckout = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const {
      id_producto,
      cantidad = 1,
      id_empresa = 1,
    } = await request.body.json();

    if (
      !Number.isInteger(id_producto) ||
      !Number.isInteger(cantidad) ||
      cantidad < 1
    ) {
      response.status = 400;
      response.body = {
        success: false,
        message: "id_producto y cantidad deben ser enteros válidos",
      };
      return;
    }

    const producto = await Producto.ObtenerPorId(id_producto, id_empresa);

    if (!producto) {
      response.status = 404;
      response.body = { success: false, message: "Producto no encontrado" };
      return;
    }

    if (!producto.activo) {
      response.status = 400;
      response.body = { success: false, message: "Producto inactivo" };
      return;
    }

    const stock = Number(producto.stock_disponible ?? 0);
    if (stock < cantidad) {
      response.status = 409;
      response.body = { success: false, message: "Stock insuficiente" };
      return;
    }

    const precio = Number(producto.precio);
    const total = precio * cantidad;
    const amountInCents = Math.round(total * 100);
    const currency = "COP";
    const reference = `pedido_${id_producto}_${Date.now()}`;

    const id_pedido = await PagoModel.crearPedidoPendiente({
      id_empresa,
      id_usuario: ID_USUARIO_PRUEBA,
      id_direccion: ID_DIRECCION_PRUEBA,
      total,
      reference,
    });

    await PagoModel.crearDetallePedido({
      id_pedido,
      id_producto,
      cantidad,
      precio_unitario: precio,
    });

    const signature = await generarFirmaIntegridad(
      reference,
      amountInCents,
      currency,
    );

    response.status = 200;
    response.body = {
      success: true,
      publicKey: getWompiPublicKey(),
      currency,
      amountInCents,
      reference,
      signature,
      id_pedido,
      producto: {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio,
        cantidad,
        total,
        stock_disponible: stock,
      },
    };
  } catch (error) {
    console.error("Error crearCheckout:", error);
    response.status = 500;
    response.body = { success: false, message: "Error en el servidor" };
  }
};

export const wompiWebhook = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    const body = await request.body.json();
    console.log("Webhook Wompi:", JSON.stringify(body, null, 2));

    const transaction =
      body?.data?.transaction ??
      body?.data ??
      null;

    if (!transaction) {
      response.status = 200;
      response.body = { received: true };
      return;
    }

    const status = transaction.status as string | undefined;
    const reference = transaction.reference as string | undefined;
    const transactionId = String(transaction.id ?? "");
    const amountInCents = Number(transaction.amount_in_cents ?? 0);
    const monto = amountInCents / 100;

    if (status === "APPROVED" && reference) {
      await PagoModel.confirmarPorReferencia({
        reference,
        referencia_ext: transactionId,
        monto,
        respuesta_raw: JSON.stringify(body),
      });
      console.log(`Pago aprobado. reference=${reference}`);
    } else {
      console.log(`Evento ignorado. status=${status} reference=${reference}`);
    }

    response.status = 200;
    response.body = { received: true };
  } catch (error) {
    console.error("Error webhook Wompi:", error);
    response.status = 500;
    response.body = { success: false };
  }
};