import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  editarProveedor,
  cambiarEstadoProveedor,
} from "../../Controller/Admin/proveedorController.ts";

const proveedorRouter = new Router();

proveedorRouter.use(authMiddleware);
proveedorRouter.use(soloAdmin);

proveedorRouter.get("/api/admin/proveedores", listarProveedores);
proveedorRouter.get("/api/admin/proveedores/:id", obtenerProveedor);
proveedorRouter.post("/api/admin/proveedores", crearProveedor);
proveedorRouter.put("/api/admin/proveedores/:id", editarProveedor);
proveedorRouter.patch(
  "/api/admin/proveedores/:id/estado",
  cambiarEstadoProveedor,
);

export { proveedorRouter };
