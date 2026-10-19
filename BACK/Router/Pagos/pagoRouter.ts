import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente } from "../../Middlewares/roles.ts";
import {
  confirmarPago,
  crearIntencionPago,
  listarPagosAdmin,
} from "../../Controller/Pagos/pagoController.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";

const pagoRouter = new Router();

pagoRouter.post(
  "/api/cliente/pago/crear-intencion",
  authMiddleware,
  soloCliente,
  crearIntencionPago,
);
pagoRouter.post(
  "/api/cliente/pago/confirmar/:idPedido",
  authMiddleware,
  soloCliente,
  confirmarPago,
);
pagoRouter.get(
  "/api/admin/pagos",
  authMiddleware,
  soloAdmin,
  listarPagosAdmin,
);

export { pagoRouter };