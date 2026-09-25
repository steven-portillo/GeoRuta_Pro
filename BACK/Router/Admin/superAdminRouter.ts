import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloSuperAdmin } from "../../Middlewares/roles.ts";
import {
  listarEmpresas,
  cambiarEstadoEmpresa,
  listarClientes,
  cambiarEstadoCliente,
  editarCliente,
  obtenerPerfil,
  editarPerfil,
  cambiarPasswordPerfil,
} from "../../Controller/Admin/superAdminController.ts";

const superAdminRouter = new Router();

superAdminRouter.use(authMiddleware);
superAdminRouter.use(soloSuperAdmin);

superAdminRouter.get("/api/admin/superadmin/empresas", listarEmpresas);
superAdminRouter.patch(
  "/api/admin/superadmin/empresas/:id/estado",
  cambiarEstadoEmpresa,
);

superAdminRouter.get("/api/admin/superadmin/clientes", listarClientes);
superAdminRouter.patch(
  "/api/admin/superadmin/clientes/:id/estado",
  cambiarEstadoCliente,
);
superAdminRouter.put("/api/admin/superadmin/clientes/:id", editarCliente);

superAdminRouter.get("/api/admin/superadmin/perfil", obtenerPerfil);
superAdminRouter.put("/api/admin/superadmin/perfil", editarPerfil);
superAdminRouter.patch(
  "/api/admin/superadmin/perfil/password",
  cambiarPasswordPerfil,
);

export { superAdminRouter };