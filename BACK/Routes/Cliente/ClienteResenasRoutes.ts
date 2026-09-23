// Routes/Cliente/ClienteResenasRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerResenas, guardarResena } from "../../Controllers/Cliente/ClienteResenasController.ts";

const router = new Router();
router.get("/cliente/resenas", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerResenas);
router.post("/cliente/resenas", VerificarAutenticacion, VerificarRol("CLIENTE"), guardarResena);

export default router;