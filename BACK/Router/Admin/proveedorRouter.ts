import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import { 
    listarProveedores, crearProveedor,
    editarProveedor, cambiarEstadoProveedor,
    obtenerProveedor
} from "../../Controller/Admin/proveedorController.ts";


const proveedorRouter = new Router();

proveedorRouter.use(authMiddleware);
proveedorRouter.use(soloAdmin);

proveedorRouter.get("/api/admin/proveedores", listarProveedores);
proveedorRouter.get("/api/admin/proveedor/:id", obtenerProveedor);
proveedorRouter.post("/api/admin/crear-proveedor", crearProveedor);
proveedorRouter.put("/api/admin/proveedor/:id", editarProveedor);
proveedorRouter.patch("/api/admin/proveedor/:id/estado", cambiarEstadoProveedor);


export { proveedorRouter};