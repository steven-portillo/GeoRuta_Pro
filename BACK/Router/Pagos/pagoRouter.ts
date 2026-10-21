import { Router } from "../../Dependencies/dependencias.ts";
import { recibirWebhookWompi } from "../../Controller/Pagos/wompiController.ts";

const pagoRouter = new Router();

pagoRouter.post("/api/pagos/wompi/webhook", recibirWebhookWompi);

export { pagoRouter };
