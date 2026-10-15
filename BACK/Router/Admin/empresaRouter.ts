import { Router } from "../../Dependencies/dependencias.ts";
import { colorEmpresa, actualizarColorEmpresa } from "../../Controller/Admin/empresaController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import { datosPerfilSB } from "../../Controller/Auth/authController.ts"

const empresaRouter = new Router();

empresaRouter.get("/api/color-empresa", authMiddleware, colorEmpresa);
empresaRouter.get("/api/admin/perfil", authMiddleware, soloAdmin, datosPerfilSB);
empresaRouter.patch("/api/admin/cambiar-color-empresa", authMiddleware, soloAdmin, actualizarColorEmpresa)

export {empresaRouter};