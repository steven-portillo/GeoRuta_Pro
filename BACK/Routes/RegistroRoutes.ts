import { Router } from "../Dependencies/Dependencias.ts";
import { registrar } from "../Controllers/RegistroController.ts";

const router = new Router();

router.post("/registro", registrar);

export default router;