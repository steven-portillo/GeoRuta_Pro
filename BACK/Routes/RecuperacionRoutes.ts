import { Router } from "../Dependencies/Dependencias.ts";
import { restablecerPassword, solicitarRecuperacion } from "../Controllers/RecuperacionController.ts";

const router = new Router();

// rutas publicas (no llevan VerificarAutenticacion): el usuario no puede iniciar sesion todavia
router.post("/auth/recuperar/solicitar", solicitarRecuperacion);
router.post("/auth/recuperar/restablecer", restablecerPassword);

export default router;