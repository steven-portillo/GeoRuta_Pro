import { Router } from "../../Dependencies/dependencias.ts";
import { colorEmpresa, actualizarColorEmpresa } from "../../Controller/Admin/empresaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";

const empresaRouter = new Router();

empresaRouter.get("/api/color-empresa", authMiddleware, colorEmpresa);

empresaRouter.patch("/api/admin/cambiar-color-empresa", authMiddleware, soloAdmin, actualizarColorEmpresa)

export {empresaRouter};