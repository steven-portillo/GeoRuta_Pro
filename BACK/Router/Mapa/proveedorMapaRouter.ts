import { Router } from "../../Dependencies/dependencias.ts";
import { destinosEnRutaProveedor } from "../../Controller/Mapa/proveedorMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloProveedor } from "../../Middlewares/roles.ts";

const proveedorMapaRouter = new Router();

proveedorMapaRouter.get(
  "/api/proveedor/mapa/destinos-en-ruta",
  authMiddleware,
  soloProveedor,
  destinosEnRutaProveedor,
);

export { proveedorMapaRouter };
