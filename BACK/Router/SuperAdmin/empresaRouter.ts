// empresasRouter.ts
import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloSuperAdmin } from "../../Middlewares/roles.ts";
import {
  listarEmpresas,
  cambiarEstadoEmpresa,
} from "../../Controller/SuperAdmin/empresaController.ts";

const empresasRouter = new Router();
empresasRouter.use(authMiddleware);
empresasRouter.use(soloSuperAdmin);

empresasRouter.get("/api/superadmin/empresas", listarEmpresas);
empresasRouter.patch(
  "/api/superadmin/empresas/:id/estado",
  cambiarEstadoEmpresa,
);

export { empresasRouter };