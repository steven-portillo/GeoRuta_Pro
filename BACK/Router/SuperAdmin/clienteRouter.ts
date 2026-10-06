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

clienteRouter.get("/api/superadmin/clientes", listarClientes);
clienteRouter.get("/api/superadmin/clientes/:id", obtenerCliente);
clienteRouter.patch(
  "/api/superadmin/clientes/:id/estado",
  cambiarEstadoCliente,
);
clienteRouter.put("/api/superadmin/clientes/:id", editarCliente);

export { clienteRouter };