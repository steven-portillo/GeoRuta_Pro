// Routes/Proveedor/ProveedorPerfilRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerPerfil, actualizarPerfil, subirFoto } from "../../Controllers/Proveedor/ProveedorPerfilController.ts";

const router = new Router();
router.get("/proveedor/perfil", VerificarAutenticacion, VerificarRol("PROVEEDOR"), obtenerPerfil);
router.post("/proveedor/perfil", VerificarAutenticacion, VerificarRol("PROVEEDOR"), actualizarPerfil);
router.post("/proveedor/perfil/foto", VerificarAutenticacion, VerificarRol("PROVEEDOR"), subirFoto);

export default router;