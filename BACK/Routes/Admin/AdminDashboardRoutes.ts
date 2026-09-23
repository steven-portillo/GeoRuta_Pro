import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerMetricasInicio } from "../../Controllers/Admin/AdminDashboardController.ts";

const router = new Router();

router.get("/admin/inicio/metricas", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerMetricasInicio);

export default router;