// Routes/Proveedor/ProveedorNotificacionesRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerNotificaciones,
  marcarNotificacionesLeidas,
} from "../../Controllers/Proveedor/ProveedorNotificacionesController.ts";

const router = new Router();
router.get("/proveedor/notificaciones", VerificarAutenticacion, VerificarRol("PROVEEDOR"), obtenerNotificaciones);
router.post(
  "/proveedor/notificaciones/marcar-leidas",
  VerificarAutenticacion,
  VerificarRol("PROVEEDOR"),
  marcarNotificacionesLeidas,
);

export default router;