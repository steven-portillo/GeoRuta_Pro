import { Router } from "../Dependencies/Dependencias.ts";
import { conectarRastreo } from "../Controllers/RastreoController.ts";

const router = new Router();

router.get("/ws/rastreo/:idPedido", conectarRastreo);

export default router;