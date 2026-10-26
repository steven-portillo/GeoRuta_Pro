import { Router } from "../../Dependencies/dependencias.ts";
import { listarRepartidoresMapaAdmin } from "../../Controller/Mapa/adminMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";

const adminMapaRouter = new Router();

adminMapaRouter.get(
  "/api/admin/mapa/repartidores",
  authMiddleware,
  soloAdmin,
  listarRepartidoresMapaAdmin,
);

export { adminMapaRouter };
