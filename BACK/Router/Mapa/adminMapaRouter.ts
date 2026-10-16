import { Router } from "../../Dependencies/dependencias.ts";
import { listarRepartidoresMapaAdmin } from "../../Controller/Mapa/adminMapaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts"; // o el nombre que uses

const AdminMapaRouter = new Router();

AdminMapaRouter.get(
  "/admin/mapa/repartidores",
  authMiddleware,
  soloAdmin,
  listarRepartidoresMapaAdmin,
);

export { AdminMapaRouter };