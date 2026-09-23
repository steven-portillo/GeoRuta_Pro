import { Router } from "../Dependencies/Dependencias.ts";
import { registrarEmpresa } from "../Controllers/RegistroEmpresaController.ts";

const router = new Router();

router.post("/registro-empresa", registrarEmpresa);

export default router;