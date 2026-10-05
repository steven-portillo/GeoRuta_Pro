import { Context } from "../dependencies/dependencias.ts";
import { stripe } from "../helper/stripe.ts";
import { InventarioModel } from "../model/inventarioModel.ts";
import { ProductoModel } from "../model/productoModel.ts";
import {pagosModel} from "../model/pagosModel.ts"
import { pedidoModel } from "../model/pedidosModel.ts";

//reemplaza los datos reales del cliente autenticado
const ID_EMPRESA_PRUEBA = 1;
const ID_USUARIO_PRUEBA = 1;
const ID_DIRECCION_PRUEBA = 1;

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

/**
 * Crear sesion de pago, atravez del metodo CheckOut
 * de stripe a traves de enlace externo
 */
export const SesionPago = async (ctx: Context) => {
  const { response, request } = ctx;

  try {
    const { id_producto, cantidad = 1 } = await request.body.json();

    if (!Number.isInteger(id_producto) || !Number.isInteger(cantidad) || cantidad < 1) {
      response.status = 401;
      response.body = {
        success: false,
        message: "La cantidad o el producto son inválidos"
    };
      return;
    }

    const producto = await new ProductoModel(null, id_producto).getProductoId();
    if (!producto) {
      response.status = 401;
      response.body = {
        success: false,
        message: "producto no encontrado"
    };
      return;
    }

    const inventario = await new InventarioModel(null, id_producto).getStock();
    if (!inventario || inventario.stock_disponible < cantidad) {
        console.log("Inventario recibido:", inventario);
      response.status = 401;
      response.body = {
        success: false,
        message: "stock insuficiente"
    };
      return;
    }

    const total = Number(producto.precio) * cantidad;

    const id_pedido = await new pedidoModel({
        id_empresa: ID_EMPRESA_PRUEBA,
        id_usuario: ID_USUARIO_PRUEBA,
        id_direccion: ID_DIRECCION_PRUEBA,
        total,
    }).crearPedido();

    const sesionPago = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: cantidad,
          price_data: {
            currency: "cop",
            product_data: {
              name: producto.nombre,
              ...(producto.descripcion && { description: producto.descripcion }),
            },
            unit_amount: Math.round(Number(producto.precio) * 100)
          },
        },
      ],
      metadata: {
        id_pedido: String(id_pedido),
        id_producto: String(producto.id_producto),
        cantidad: String(cantidad),
      },
      success_url: "http://localhost:4321/pago-exitoso?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:4321/pago-cancelado",
    });

    response.status = 201;
    response.body = {
        url: sesionPago.url
    };
  } catch (error) {
    response.status = 500;
    response.body = {
        success: false,
        message: "error en el servidor"
    };
    console.log(error);
  }
};


/**
 * WEB-HOOK
 * Cuando llega el evento checkout.session.completed, el código hace estas 3 cosas importantes:
 * 1. Descuenta el stock del producto
 * 2. Marca el pedido como pagado (pago_confirmado = 1 -> true y id_estado = 2 -> Aprobado)
 * 3. Registra el pago en la tabla pagos
 */
export const stripeWebhook = async (ctx: Context) => {
    const { request, response } = ctx;

    const signature = request.headers.get("stripe-signature");
    const body = await request.body.text();

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        endpointSecret,
        );
    } catch (error) {
        console.log("Firma inválida:", error);
        response.status = 400;
        response.body = { success: false, message: "Webhook error" };
        return;
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        const id_pedido = Number(session.metadata?.id_pedido);
        const id_producto = Number(session.metadata?.id_producto);
        const cantidad = Number(session.metadata?.cantidad);
        const monto = (session.amount_total ?? 0) / 100;

        if (!id_pedido || !id_producto || !cantidad) {
        response.status = 400;
        response.body = {
            success: false,
            message: "Metadata incompleta",
        };
        return;
        }

        try {
        await new InventarioModel(null, id_producto).descontarStock(cantidad);
        await new pedidoModel(null, id_pedido).confirmarPago();
        await new pagosModel({
            id_pedido,
            referencia_ext: session.id,
            monto,
            respuesta_raw: JSON.stringify(session),
        }).registrarPago();

        console.log(`Pedido ${id_pedido} confirmado y pagado`);
        } catch (error) {
        console.error("Error procesando el pago:", error);
        response.status = 500;
        response.body = {
            success: false,
            message: "Error interno"
        };
        return;
        }
    }

    response.status = 200;
    response.body = {
        received: true
    };
};