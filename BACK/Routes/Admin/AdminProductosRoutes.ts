import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerProductos,
  guardarProducto,
  toggleProducto,
  obtenerCategorias,
  crearCategoria,
  eliminarCategoria,
  renombrarCategoria,
} from "../../Controllers/Admin/AdminProductosController.ts";

const router = new Router();

router.get("/admin/productos", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerProductos);
router.post("/admin/productos", VerificarAutenticacion, VerificarRol("ADMIN"), guardarProducto);
router.post("/admin/productos/toggle", VerificarAutenticacion, VerificarRol("ADMIN"), toggleProducto);

router.get("/admin/categorias", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerCategorias);
router.post("/admin/categorias", VerificarAutenticacion, VerificarRol("ADMIN"), crearCategoria);
router.post("/admin/categorias/eliminar", VerificarAutenticacion, VerificarRol("ADMIN"), eliminarCategoria);
router.post("/admin/categorias/renombrar", VerificarAutenticacion, VerificarRol("ADMIN"), renombrarCategoria);

export default router;