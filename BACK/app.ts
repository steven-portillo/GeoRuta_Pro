import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
import { superAdminRouter } from "./Router/SuperAdmin/superAdminRouter.ts";
import { categoriaRouter } from "./Router/Admin/categoriaRouter.ts";
import { inventarioRouter } from "./Router/Admin/inventarioRouter.ts";
import { productoRouter } from "./Router/Admin/productoController.ts";
import { proveedorRouter } from "./Router/Admin/proveedorRouter.ts";
import { empresaRouter } from "./Router/Admin/empresaRouter.ts";
import { PruebasRouter } from "./Router/Mapa/pruebasRouter.ts";
import { manejarWsUbicacion } from "./ws/ubicacionHub.ts";

import { servirArchivos } from "./Middlewares/archivos.middleware.ts";


const app = new Application();

app.use(servirArchivos);
// CORS
app.use(async (ctx, next) => {
  const { pathname } = ctx.request.url;

  if (
    pathname === "/ws" &&
    ctx.request.headers.get("upgrade")?.toLowerCase() === "websocket"
  ) {
    const socket = await ctx.upgrade();
    manejarWsUbicacion(socket);
    return;
  }

  await next();
});

// CORS
app.use(
  oakCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rutas
const routers = [
  //rutas publicas y de auth
  authRouter, 
  //rutas de superadmin
  superAdminRouter,
  //rutas del admin
  categoriaRouter,
  inventarioRouter,
  productoRouter, 
  proveedorRouter,
  empresaRouter,
  //rutas de mapa(prueba)
  PruebasRouter,
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
