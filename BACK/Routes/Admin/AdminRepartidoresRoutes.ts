import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  guardarRepartidor,
  obtenerRepartidores,
  obtenerRepartidoresDisponibles,
  asignarRepartidor,
  obtenerPedidosRepartidor,
} from "../../Controllers/Admin/AdminRepartidoresController.ts";

const router = new Router();

router.post("/admin/repartidores", VerificarAutenticacion, VerificarRol("ADMIN"), guardarRepartidor);
router.get("/admin/repartidores", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerRepartidores);
router.get(
  "/admin/repartidores/disponibles",
  VerificarAutenticacion,
  VerificarRol("ADMIN"),
  obtenerRepartidoresDisponibles,
);
router.post("/admin/repartidores/asignar", VerificarAutenticacion, VerificarRol("ADMIN"), asignarRepartidor);
router.get(
  "/admin/repartidores/:id/pedidos",
  VerificarAutenticacion,
  VerificarRol("ADMIN"),
  obtenerPedidosRepartidor,
);

export default router;