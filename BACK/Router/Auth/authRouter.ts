import { Router } from "../../Dependencies/dependencias.ts";
import {
  iniciarSesion,
  registrarCliente,
  registrarEmpresa,
  cerrarSesion,
} from "../../Controller/Auth/authController.ts";

const authRouter = new Router();

authRouter.post("/api/auth/login", iniciarSesion);
authRouter.post("/api/auth/register", registrarCliente);
authRouter.post("/api/auth/register-empresa", registrarEmpresa);
authRouter.post("/api/auth/logout", cerrarSesion);

export { authRouter };
