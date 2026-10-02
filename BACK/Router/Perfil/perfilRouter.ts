import { Router } from "../../Dependencies/dependencias.ts";
import { authMiddleware } from "../../Middlewares/validarJWT.ts";
import {
  obtenerPerfil,
  editarPerfil,
  cambiarPassword,
} from "../../Controller/Perfil/perfilController.ts";

const perfilRouter = new Router();

perfilRouter.use(authMiddleware);

perfilRouter.get("/api/perfil", obtenerPerfil);
perfilRouter.put("/api/perfil", editarPerfil);
perfilRouter.patch("/api/perfil/password", cambiarPassword);

export { perfilRouter };
