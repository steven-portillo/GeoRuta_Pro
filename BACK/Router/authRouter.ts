import { Router } from "../Dependencies/dependencias.ts";
import {
  iniciarSesion,
  registrarCliente,
} from "../Controller/authController.ts";

const authRouter = new Router();

authRouter.post("/api/login", iniciarSesion);
authRouter.post("/api/register", registrarCliente);

export { authRouter };
