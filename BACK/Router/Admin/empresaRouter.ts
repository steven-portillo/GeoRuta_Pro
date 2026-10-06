import { Router } from "../../Dependencies/dependencias.ts";
import { colorEmpresa, obtenerEmpresa, editarEmpresa} from "../../Controller/Admin/empresaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";

const empresaRouter = new Router();

empresaRouter.get("/api/color-empresa", authMiddleware, colorEmpresa);

empresaRouter.get("/api/admin/empresa", authMiddleware, soloAdmin, obtenerEmpresa);
empresaRouter.put("/api/admin/empresa", authMiddleware, soloAdmin, editarEmpresa);

export {empresaRouter};