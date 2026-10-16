import { Router } from "../../Dependencies/dependencias.ts";
import { destinosEnRutaProveedor } from "../../Controller/Mapa/proveedorMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloProveedor } from "../../Middlewares/roles.ts";

const ProveedorMapaRouter = new Router();

// Una sola ruta (antes tenías /destinos y /destinos-en-ruta duplicadas)
ProveedorMapaRouter.get(
  "/proveedor/mapa/destinos-en-ruta",
  authMiddleware,
  soloProveedor,
  destinosEnRutaProveedor,
);

export { ProveedorMapaRouter };