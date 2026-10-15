// clienteRouter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloSuperAdmin } from "../../Middlewares/roles.ts";
import {
  listarClientes,
  obtenerCliente,
  cambiarEstadoCliente,
  editarCliente,
} from "../../Controller/SuperAdmin/clienteController.ts";

const clientesRouter = new Router();
clientesRouter.use(authMiddleware);
clientesRouter.use(soloSuperAdmin);

clientesRouter.get("/api/admin/superadmin/clientes", listarClientes);
clientesRouter.get("/api/admin/superadmin/clientes/:id", obtenerCliente);
clientesRouter.patch(
  "/api/admin/superadmin/clientes/:id/estado",
  cambiarEstadoCliente,
);
clientesRouter.put("/api/admin/superadmin/clientes/:id", editarCliente);

export { clientesRouter };
