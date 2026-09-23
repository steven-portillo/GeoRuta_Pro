// Routes/Cliente/ClientePerfilRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerPerfil,
  obtenerDatosUsuario,
  subirFoto,
  guardarDatosPersonales,
} from "../../Controllers/Cliente/ClientePerfilController.ts";

const router = new Router();
router.get("/cliente/perfil", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerPerfil);
router.get("/cliente/perfil/cuenta", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerDatosUsuario);
router.post("/cliente/perfil", VerificarAutenticacion, VerificarRol("CLIENTE"), guardarDatosPersonales);
router.post("/cliente/perfil/foto", VerificarAutenticacion, VerificarRol("CLIENTE"), subirFoto);

export default router;