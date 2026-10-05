import { Router } from "../dependencies/dependencias.ts";
import { loginGoogle } from "../controller/authController.ts";

const authRouter = new Router();

authRouter.post("/auth/google", loginGoogle);

export { authRouter };