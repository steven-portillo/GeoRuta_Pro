import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerPerfil,
  actualizarPerfil,
  subirFotoPerfil,
  subirLogoEmpresaAdmin,
} from "../../Controllers/Admin/AdminPerfilController.ts";

const router = new Router();

router.get("/admin/perfil", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerPerfil);
router.post("/admin/perfil", VerificarAutenticacion, VerificarRol("ADMIN"), actualizarPerfil);
router.post("/admin/perfil/foto", VerificarAutenticacion, VerificarRol("ADMIN"), subirFotoPerfil);
router.post("/admin/perfil/logo-empresa", VerificarAutenticacion, VerificarRol("ADMIN"), subirLogoEmpresaAdmin);

export default router;