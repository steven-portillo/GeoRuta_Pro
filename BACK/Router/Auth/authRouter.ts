import { Router } from "../../Dependencies/dependencias.ts";
import {
  datosPerfilSB,
  iniciarSesion,
  registrarCliente,
  registrarEmpresa,
  cerrarSesion,
} from "../../Controller/Auth/authController.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";

const authRouter = new Router();

authRouter.get("/api/auth/perfil-sb", authMiddleware, datosPerfilSB);
authRouter.post("/api/auth/login", iniciarSesion);
authRouter.post("/api/auth/register", registrarCliente);
authRouter.post("/api/auth/register-empresa", registrarEmpresa);
authRouter.post("/api/auth/logout", cerrarSesion);

export { authRouter };