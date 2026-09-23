import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  obtenerPedidos,
  cambiarEstadoPedido,
  obtenerDetallePedido,
} from "../../Controllers/Admin/AdminPedidosController.ts";

const router = new Router();

router.get("/admin/pedidos", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerPedidos);
router.post("/admin/pedidos/cambiar-estado", VerificarAutenticacion, VerificarRol("ADMIN"), cambiarEstadoPedido);
router.get("/admin/pedidos/:id", VerificarAutenticacion, VerificarRol("ADMIN"), obtenerDetallePedido);

export default router;