// Routes/Cliente/ClienteCatalogoRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerProveedores, obtenerProductosEmpresa } from "../../Controllers/Cliente/ClienteCatalogoController.ts";

const router = new Router();
router.get("/cliente/proveedores", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerProveedores);
router.get(
  "/cliente/proveedores/:idEmpresa/productos",
  VerificarAutenticacion,
  VerificarRol("CLIENTE"),
  obtenerProductosEmpresa,
);

export default router;