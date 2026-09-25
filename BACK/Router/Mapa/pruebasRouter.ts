import { Router } from "../../Dependencies/dependencias.ts";
import { getDestinosRutaProveedor, pedidosEnTransitoCliente } from "../../Controller/Mapa/pruebasController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente, soloProveedor } from "../../Middlewares/roles.ts";

const PruebasRouter = new Router();
PruebasRouter.get(
  "/proveedor/mapa/destinos",
  authMiddleware,
  soloProveedor,
  getDestinosRutaProveedor,
);

PruebasRouter.get("/cliente/mapa/pedidos-en-transito", authMiddleware, soloCliente, pedidosEnTransitoCliente);



export {PruebasRouter};