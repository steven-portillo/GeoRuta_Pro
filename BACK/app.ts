import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
import { superAdminRouter } from "./Router/SuperAdmin/superAdminRouter.ts";
import { categoriaRouter } from "./Router/Admin/categoriaRouter.ts";
import { productoRouter } from "./Router/Admin/productoRouter.ts";
import { inventarioRouter } from "./Router/Admin/inventarioRouter.ts";

const app = new Application();

// CORS
app.use(
  oakCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rutas
const routers = [
  authRouter,
  superAdminRouter,
  categoriaRouter,
  productoRouter,
  inventarioRouter,
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
