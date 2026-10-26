import { Router } from "../../Dependencies/dependencias.ts";
import {
  iniciarSesion,
  registrarCliente,
  registrarEmpresa,
  cerrarSesion,
  loginGoogle,
  solicitarRecuperacionContrasena,
  verificarCodigoRecuperacion,
  restablecerContrasena,
} from "../../Controller/Auth/authController.ts";

const authRouter = new Router();

authRouter.post("/api/auth/login", iniciarSesion);
authRouter.post("/api/auth/google", loginGoogle);
authRouter.post("/api/auth/register", registrarCliente);
authRouter.post("/api/auth/register-empresa", registrarEmpresa);
authRouter.post("/api/auth/logout", cerrarSesion);
authRouter.post(
  "/api/auth/password-recovery/request",
  solicitarRecuperacionContrasena,
);
authRouter.post(
  "/api/auth/password-recovery/verify",
  verificarCodigoRecuperacion,
);
authRouter.post(
  "/api/auth/password-recovery/reset",
  restablecerContrasena,
);

export { authRouter };
