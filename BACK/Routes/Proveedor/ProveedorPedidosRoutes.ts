// Routes/Proveedor/ProveedorPedidosRoutes.ts
import { Router } from "../../Dependencies/Dependencias.ts";
import { VerificarAutenticacion } from "../../Middlewares/VerificarAutenticacion.ts";
import { VerificarRol } from "../../Middlewares/VerificarRol.ts";
import { obtenerPedidos, cambiarEstado } from "../../Controllers/Proveedor/ProveedorPedidosController.ts";

const router = new Router();
router.get("/proveedor/pedidos", VerificarAutenticacion, VerificarRol("PROVEEDOR"), obtenerPedidos);
router.post("/proveedor/pedidos/cambiar-estado", VerificarAutenticacion, VerificarRol("PROVEEDOR"), cambiarEstado);

export default router;