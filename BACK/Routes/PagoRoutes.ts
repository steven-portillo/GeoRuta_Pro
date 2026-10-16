import { Router } from "../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../Middlewares/VerificarRol.ts";
import { confirmarExito, crearIntencion, simularPago, webhook } from "../Controllers/PagoController.ts";

const router = new Router();

router.post("/pago/crear-intencion", VerificarAutenticacion, VerificarRol("CLIENTE"), crearIntencion);
router.get("/pago/exito/:idPedido", VerificarAutenticacion, VerificarRol("CLIENTE"), confirmarExito);
router.post("/pago/webhook", webhook); // sin auth: lo llama wompi, se valida por checksum, no por jwt
router.get("/pago/simular/:idPedido", VerificarAutenticacion, VerificarRol("CLIENTE"), simularPago);

export default router;