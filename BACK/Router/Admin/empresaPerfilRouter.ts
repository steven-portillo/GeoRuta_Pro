import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  obtenerEmpresa,
  editarEmpresa,
  eliminarLogoEmpresa,
} from "../../Controller/Admin/empresaPerfilController.ts";

const empresaPerfilRouter = new Router();

empresaPerfilRouter.use(authMiddleware);
empresaPerfilRouter.use(soloAdmin);

empresaPerfilRouter.get("/api/admin/empresa", obtenerEmpresa);
empresaPerfilRouter.put("/api/admin/empresa", editarEmpresa);
empresaPerfilRouter.delete("/api/admin/empresa/logo", eliminarLogoEmpresa);
export { empresaPerfilRouter };
