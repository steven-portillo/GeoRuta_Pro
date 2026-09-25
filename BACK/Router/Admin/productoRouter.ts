import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  editarProducto,
  cambiarEstadoProducto,
} from "../../Controller/Admin/productoController.ts";

const productoRouter = new Router();

productoRouter.use(authMiddleware);
productoRouter.use(soloAdmin);

productoRouter.get("/api/admin/productos", listarProductos);
productoRouter.get("/api/admin/productos/:id", obtenerProducto);
productoRouter.post("/api/admin/productos", crearProducto);
productoRouter.put("/api/admin/productos/:id", editarProducto);
productoRouter.patch("/api/admin/productos/:id/estado", cambiarEstadoProducto);

export { productoRouter };
