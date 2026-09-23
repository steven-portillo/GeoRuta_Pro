import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerPagos } from "../../Controllers/Admin/AdminPagosController.ts";

const router = new Router();

router.get("/admin/pagos", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerPagos);

export default router;