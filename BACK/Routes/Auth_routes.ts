import { Router } from "../Dependencies/Dependencias.ts";
import { login, loginGoogle } from "../Controllers/AuthController.ts";

const router = new Router();

router.post("/auth/login", login);
router.post("/auth/google", loginGoogle);

export default router;