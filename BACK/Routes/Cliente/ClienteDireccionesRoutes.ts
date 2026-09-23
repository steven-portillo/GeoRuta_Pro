import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerDirecciones,
  guardarDireccion,
  eliminarDireccion,
} from "../../Controllers/Cliente/ClienteDireccionesController.ts";

const router = new Router();

router.get("/cliente/direcciones", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerDirecciones);
router.post("/cliente/direcciones", VerificarAutenticacion, VerificarRol("CLIENTE"), guardarDireccion);
router.post("/cliente/direcciones/eliminar", VerificarAutenticacion, VerificarRol("CLIENTE"), eliminarDireccion);

export default router;