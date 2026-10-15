import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloCliente } from "../../Middlewares/roles.ts";
import {
  cambiarEstadoDireccionCliente,
  crearDireccionCliente,
  editarDireccionCliente,
  listarDireccionesCliente,
} from "../../Controller/Cliente/direccionController.ts";
import {
  listarEmpresasCatalogo,
  listarProductosEmpresa,
  obtenerProductoCatalogo,
} from "../../Controller/Cliente/catalogoController.ts";
import {
  eliminarItemCarrito,
  establecerCantidadCarrito,
  obtenerCarritoCliente,
} from "../../Controller/Cliente/carritoController.ts";
import {
  cancelarPedidoCliente,
  crearPedidoCliente,
  listarPedidosCliente,
  obtenerPedidoCliente,
} from "../../Controller/Cliente/pedidoController.ts";
import {
  crearResenaCliente,
  desactivarResenaCliente,
  editarResenaCliente,
} from "../../Controller/Cliente/resenaController.ts";

const clienteRouter = new Router();

clienteRouter.use(authMiddleware);
clienteRouter.use(soloCliente);

clienteRouter.get("/api/cliente/direcciones", listarDireccionesCliente);
clienteRouter.post("/api/cliente/direcciones", crearDireccionCliente);
clienteRouter.put("/api/cliente/direcciones/:id", editarDireccionCliente);
clienteRouter.patch(
  "/api/cliente/direcciones/:id/estado",
  cambiarEstadoDireccionCliente,
);

clienteRouter.get("/api/cliente/empresas", listarEmpresasCatalogo);
clienteRouter.get(
  "/api/cliente/empresas/:id/productos",
  listarProductosEmpresa,
);
clienteRouter.get("/api/cliente/productos/:id", obtenerProductoCatalogo);

clienteRouter.get("/api/cliente/carrito", obtenerCarritoCliente);
clienteRouter.put(
  "/api/cliente/carrito/items/:id_producto",
  establecerCantidadCarrito,
);
clienteRouter.delete(
  "/api/cliente/carrito/items/:id_producto",
  eliminarItemCarrito,
);

clienteRouter.get("/api/cliente/pedidos", listarPedidosCliente);
clienteRouter.post("/api/cliente/pedidos", crearPedidoCliente);
clienteRouter.get("/api/cliente/pedidos/:id", obtenerPedidoCliente);
clienteRouter.patch(
  "/api/cliente/pedidos/:id/cancelar",
  cancelarPedidoCliente,
);
clienteRouter.post(
  "/api/cliente/pedidos/:id/resenas",
  crearResenaCliente,
);
clienteRouter.patch("/api/cliente/resenas/:id", editarResenaCliente);
clienteRouter.delete("/api/cliente/resenas/:id", desactivarResenaCliente);

export { clienteRouter };
