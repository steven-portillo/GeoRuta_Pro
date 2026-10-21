import { Router } from "../../Dependencies/dependencias.ts";
import {
  cambiarEstadoPedidoProveedor,
  listarNotificacionesProveedor,
  marcarNotificacionesProveedorLeidas,
  listarPedidosProveedor,
  obtenerDatosInicioProveedor,
} from "../../Controller/Proveedor/pedidoProveedorController.ts";
import { soloProveedor } from "../../Middlewares/roles.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";

const pedidoProveedorRouter = new Router();

pedidoProveedorRouter.use(authMiddleware);
pedidoProveedorRouter.use(soloProveedor);
pedidoProveedorRouter.get(
  "/api/proveedor/inicio/datos",
  obtenerDatosInicioProveedor,
);
pedidoProveedorRouter.get("/api/proveedor/pedidos", listarPedidosProveedor);
pedidoProveedorRouter.get(
  "/api/proveedor/notificaciones",
  listarNotificacionesProveedor,
);
pedidoProveedorRouter.post(
  "/api/proveedor/notificaciones/marcar-leidas",
  marcarNotificacionesProveedorLeidas,
);
pedidoProveedorRouter.post(
  "/api/proveedor/pedidos/cambiar-estado",
  cambiarEstadoPedidoProveedor,
);

export { pedidoProveedorRouter };
