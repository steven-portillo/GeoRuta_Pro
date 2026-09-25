import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  listarInventario,
  agregarStock,
  historialInventario,
} from "../../Controller/Admin/inventarioController.ts";

const inventarioRouter = new Router();

inventarioRouter.use(authMiddleware);
inventarioRouter.use(soloAdmin);

inventarioRouter.get("/api/admin/inventario", listarInventario);
inventarioRouter.post("/api/admin/inventario/agregar", agregarStock);
inventarioRouter.get(
  "/api/admin/inventario/:id/historial",
  historialInventario,
);

export { inventarioRouter };
