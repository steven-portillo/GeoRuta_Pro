import { Router } from "../dependencies/dependencias.ts";
import { SesionPago, stripeWebhook } from "../controller/stripeController.ts";

const stripeRouter = new Router();

stripeRouter.post("/pagos/checkout", SesionPago)
stripeRouter.post("/pagos/webhook", stripeWebhook);

export {stripeRouter};
