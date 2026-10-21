import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloProveedor } from "../../Middlewares/roles.ts";
import {
  confirmarEntregaProveedor,
  iniciarEntregasProveedor,
} from "../../Controller/Proveedor/entregaController.ts";
import {
  listarPedidosProveedor,
  obtenerPedidoProveedor,
} from "../../Controller/Proveedor/pedidoController.ts";

const proveedorRouter = new Router();

proveedorRouter.use(authMiddleware);
proveedorRouter.use(soloProveedor);

proveedorRouter.get("/api/proveedor/pedidos", listarPedidosProveedor);
proveedorRouter.get(
  "/api/proveedor/pedidos/:id",
  obtenerPedidoProveedor,
);
proveedorRouter.post(
  "/api/proveedor/entregas/iniciar",
  iniciarEntregasProveedor,
);
proveedorRouter.post(
  "/api/proveedor/pedidos/:id/confirmar-entrega",
  confirmarEntregaProveedor,
);

export { proveedorRouter };
