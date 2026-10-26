import { Router } from "../../Dependencies/dependencias.ts";
import {
  listarRepartidoresMapaCliente,
  pedidoDetalleMapaCliente,
  pedidosEnTransitoCliente,
} from "../../Controller/Mapa/clienteMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente } from "../../Middlewares/roles.ts";

const clienteMapaRouter = new Router();

clienteMapaRouter.get(
  "/api/cliente/mapa/pedidos-en-transito",
  authMiddleware,
  soloCliente,
  pedidosEnTransitoCliente,
);
clienteMapaRouter.get(
  "/api/cliente/mapa/repartidores",
  authMiddleware,
  soloCliente,
  listarRepartidoresMapaCliente,
);
clienteMapaRouter.get(
  "/api/cliente/mapa/pedido-detalle/:id",
  authMiddleware,
  soloCliente,
  pedidoDetalleMapaCliente,
);

export { clienteMapaRouter };
