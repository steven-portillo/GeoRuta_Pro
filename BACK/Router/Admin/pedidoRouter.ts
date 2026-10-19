import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  listarPedidos,
  obtenerPedido,
  aprobarPedido,
  entregarPedido,
  asignarProveedor,
  cancelarPedido,
} from "../../Controller/Admin/pedidoController.ts";
import { obtenerMetricasInicio } from "../../Controller/Admin/inicioController.ts";

const pedidoRouter = new Router();

pedidoRouter.use(authMiddleware);
pedidoRouter.use(soloAdmin);

pedidoRouter.get("/api/admin/pedidos", listarPedidos);
pedidoRouter.get("/api/admin/inicio/metricas", obtenerMetricasInicio);
pedidoRouter.get("/api/admin/pedidos/:id", obtenerPedido);
pedidoRouter.patch("/api/admin/pedidos/:id/aprobar", aprobarPedido);
pedidoRouter.patch("/api/admin/pedidos/:id/entregar", entregarPedido);
pedidoRouter.patch("/api/admin/pedidos/:id/asignar", asignarProveedor);
pedidoRouter.patch("/api/admin/pedidos/:id/cancelar", cancelarPedido);

export { pedidoRouter };
