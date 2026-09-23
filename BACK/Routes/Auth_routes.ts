import { Router } from "../Dependencies/Dependencias.ts";
import { login } from "../Controllers/AuthController.ts";

const router = new Router();

router.post("/auth/login", login);

export default router;