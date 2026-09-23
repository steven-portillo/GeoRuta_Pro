// Routes/Proveedor/ProveedorUbicacionRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { guardarUbicacion } from "../../Controllers/Proveedor/ProveedorUbicacionController.ts";

const router = new Router();
router.post("/proveedor/ubicacion", VerificarAutenticacion, VerificarRol("PROVEEDOR"), guardarUbicacion);

export default router;