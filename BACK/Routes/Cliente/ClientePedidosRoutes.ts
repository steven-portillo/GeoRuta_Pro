// Routes/Cliente/ClientePedidosRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import {
  guardarDireccion,
  crearPedido,
  obtenerPedidos,
  obtenerDetallePedido,
} from "../../Controllers/Cliente/ClientePedidosController.ts";

const router = new Router();
router.post("/cliente/direcciones", VerificarAutenticacion, VerificarRol("CLIENTE"), guardarDireccion);
router.post("/cliente/pedidos", VerificarAutenticacion, VerificarRol("CLIENTE"), crearPedido);
router.get("/cliente/pedidos", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerPedidos);
router.get("/cliente/pedidos/:id", VerificarAutenticacion, VerificarRol("CLIENTE"), obtenerDetallePedido);

export default router;