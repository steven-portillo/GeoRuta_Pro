// Routes/Proveedor/ProveedorDashboardRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerDatos } from "../../Controllers/Proveedor/ProveedorDashboardController.ts";

const router = new Router();
router.get("/proveedor/inicio/datos", VerificarAutenticacion, VerificarRol("PROVEEDOR"), obtenerDatos);

export default router;