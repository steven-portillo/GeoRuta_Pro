import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
//super
import { empresasRouter } from "./Router/SuperAdmin/empresaRouter.ts";
import { clienteRouter } from "./Router/SuperAdmin/clienteRouter.ts";
//admin
import { categoriaRouter } from "./Router/Admin/categoriaRouter.ts";
import { inventarioRouter } from "./Router/Admin/inventarioRouter.ts";
import { productoRouter } from "./Router/Admin/productoController.ts";
import { pedidoRouter } from "./Router/Admin/pedidoRouter.ts";
import { proveedorRouter } from "./Router/Admin/proveedorRouter.ts";
import { empresaRouter } from "./Router/Admin/empresaRouter.ts";
//´mapra
import { PruebasRouter } from "./Router/Mapa/pruebasRouter.ts";
import { manejarWsUbicacion } from "./ws/ubicacionHub.ts";

import { perfilRouter } from "./Router/Perfil/perfilRouter.ts";

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
  empresasRouter,
  clienteRouter,
  //rutas del admin
  categoriaRouter,
  inventarioRouter,
  productoRouter, 
  proveedorRouter,
  empresaRouter,
  pedidoRouter,
  //rutas de mapa(prueba)
  PruebasRouter,

  //rutas publicas
  perfilRouter
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
