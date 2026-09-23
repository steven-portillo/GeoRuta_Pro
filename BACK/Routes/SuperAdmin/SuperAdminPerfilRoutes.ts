import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerPerfil,
  actualizarPerfil,
  subirFotoPerfil,
} from "../../Controllers/SuperAdmin/SuperAdminPerfilController.ts";

const router = new Router();

router.get("/superadmin/perfil", VerificarAutenticacion, VerificarRol("SUPERADMIN"), obtenerPerfil);
router.post("/superadmin/perfil", VerificarAutenticacion, VerificarRol("SUPERADMIN"), actualizarPerfil);
router.post("/superadmin/perfil/foto", VerificarAutenticacion, VerificarRol("SUPERADMIN"), subirFotoPerfil);

export default router;