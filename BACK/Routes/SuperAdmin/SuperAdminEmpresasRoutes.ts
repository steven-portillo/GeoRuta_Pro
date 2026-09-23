import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerEmpresas,
  cambiarEstadoEmpresa,
  obtenerTotalUsuarios,
} from "../../Controllers/SuperAdmin/SuperAdminEmpresasController.ts";

const router = new Router();

router.get("/superadmin/empresas", VerificarAutenticacion, VerificarRol("SUPERADMIN"), obtenerEmpresas);
router.post(
  "/superadmin/empresas/cambiar-estado",
  VerificarAutenticacion,
  VerificarRol("SUPERADMIN"),
  cambiarEstadoEmpresa,
);
router.get(
  "/superadmin/usuarios/total",
  VerificarAutenticacion,
  VerificarRol("SUPERADMIN"),
  obtenerTotalUsuarios,
);

export default router;