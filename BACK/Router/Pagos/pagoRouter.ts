import { Router } from "../../Dependencies/dependencias.ts";
import { crearCheckout, wompiWebhook } from "../../Controller/Pagos/pagosController.ts";

const pagoRouter = new Router();

pagoRouter.post("/pagos/checkout", crearCheckout);
pagoRouter.post("/pagos/webhook", wompiWebhook);

export { pagoRouter };