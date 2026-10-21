import { Router } from "../../Dependencies/dependencias.ts";
import {
  cerrarSesion,
  iniciarSesion,
  registrarCliente,
  registrarEmpresa,
} from "../../Controller/Auth/authController.ts";
import { iniciarSesionGoogle } from "../../Controller/Auth/googleController.ts";
import {
  restablecerPassword,
  solicitarRestablecimientoPassword,
} from "../../Controller/Auth/passwordController.ts";

const authRouter = new Router();

authRouter.post("/api/auth/login", iniciarSesion);
authRouter.post("/api/auth/register", registrarCliente);
authRouter.post("/api/auth/register-empresa", registrarEmpresa);
authRouter.post("/api/auth/google", iniciarSesionGoogle);
authRouter.post(
  "/api/auth/forgot-password",
  solicitarRestablecimientoPassword,
);
authRouter.post("/api/auth/reset-password", restablecerPassword);
authRouter.post("/api/auth/logout", cerrarSesion);

export { authRouter };
