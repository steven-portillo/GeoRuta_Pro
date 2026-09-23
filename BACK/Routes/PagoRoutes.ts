import { Router } from "../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../Middlewares/VerificarRol.ts";
import { crearIntencion, confirmarExito, webhook, simularPago } from "../Controllers/PagoController.ts";

const router = new Router();

router.post("/pago/crear-intencion", VerificarAutenticacion, VerificarRol("CLIENTE"), crearIntencion);
router.get("/pago/exito/:idPedido", confirmarExito); // sin auth: el cliente llega recien saliendo de Stripe
router.post("/pago/webhook", webhook); // sin auth: lo llama Stripe, se valida por firma HMAC, no por JWT
router.get("/pago/simular/:idPedido", VerificarAutenticacion, VerificarRol("CLIENTE"), simularPago);

export default router;