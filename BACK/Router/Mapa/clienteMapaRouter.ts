import { Router } from "../../Dependencies/dependencias.ts";
import {
  pedidosEnTransitoCliente,
  listarRepartidoresMapaCliente,
  pedidoDetalleMapaCliente,
} from "../../Controller/Mapa/clienteMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente } from "../../Middlewares/roles.ts";

const ClienteMapaRouter = new Router();

ClienteMapaRouter.get(
  "/cliente/mapa/pedidos-en-transito",
  authMiddleware,
  soloCliente,
  pedidosEnTransitoCliente,
);

ClienteMapaRouter.get(
  "/cliente/mapa/repartidores",
  authMiddleware,
  soloCliente,
  listarRepartidoresMapaCliente,
);

ClienteMapaRouter.get(
  "/cliente/mapa/pedido-detalle/:id",
  authMiddleware,
  soloCliente,
  pedidoDetalleMapaCliente,
);

export { ClienteMapaRouter };