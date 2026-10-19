// empresaRouter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloSuperAdmin } from "../../Middlewares/roles.ts";
import {
  listarEmpresas,
  cambiarEstadoEmpresa,
} from "../../Controller/SuperAdmin/empresaController.ts";

const empresaRouter = new Router();
empresaRouter.use(authMiddleware);
empresaRouter.use(soloSuperAdmin);

empresaRouter.get("/api/admin/superadmin/empresas", listarEmpresas);
empresaRouter.patch(
  "/api/admin/superadmin/empresas/:id/estado",
  cambiarEstadoEmpresa,
);

export { empresaRouter };
