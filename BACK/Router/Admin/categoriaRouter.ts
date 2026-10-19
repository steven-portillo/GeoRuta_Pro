import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import {
  listarCategorias,
  crearCategoria,
  editarCategoria,
  cambiarEstadoCategoria,
  obtenerCategoria,
} from "../../Controller/Admin/categoriaController.ts";

const categoriaRouter = new Router();

categoriaRouter.use(authMiddleware);
categoriaRouter.use(soloAdmin);

categoriaRouter.get("/api/admin/categorias", listarCategorias);
categoriaRouter.post("/api/admin/categorias", crearCategoria);
categoriaRouter.put("/api/admin/categorias/:id", editarCategoria);
categoriaRouter.patch(
  "/api/admin/categorias/:id/estado",
  cambiarEstadoCategoria,
);
categoriaRouter.get("/api/admin/categorias/:id", obtenerCategoria);

export { categoriaRouter };
