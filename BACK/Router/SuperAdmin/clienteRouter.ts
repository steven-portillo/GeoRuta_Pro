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

const clienteRouter = new Router();
clienteRouter.use(authMiddleware);
clienteRouter.use(soloSuperAdmin);

clienteRouter.get("/api/admin/superadmin/clientes", listarClientes);
clienteRouter.get("/api/admin/superadmin/clientes/:id", obtenerCliente);
clienteRouter.patch(
  "/api/admin/superadmin/clientes/:id/estado",
  cambiarEstadoCliente,
);
clienteRouter.put("/api/admin/superadmin/clientes/:id", editarCliente);

export { clienteRouter };
