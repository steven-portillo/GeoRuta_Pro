import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import { soloAdmin } from "../../Middlewares/roles.ts";
import { 
    listarProveedores, crearProveedor,

 
} from "../../Controller/Empresa/proveedorController.ts";


const adminRouter = new Router();

adminRouter.use(authMiddleware);
adminRouter.use(soloAdmin);

adminRouter.get("/api/empresa/proveedores", listarProveedores);
adminRouter.post("/api/empresa/crear-proveedor", crearProveedor);



export { adminRouter};