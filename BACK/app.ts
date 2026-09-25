import { Application, oakCors } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
import { superAdminRouter } from "./Router/Admin/superAdminRouter.ts";
import { adminRouter } from "./Router/Empresa/adminRouter.ts";
import { PruebasRouter } from "./Router/Mapa/pruebasRouter.ts";
import { manejarWsUbicacion } from "./ws/ubicacionHub.ts";

const app = new Application();

// CORS
app.use(async (ctx, next) => {
  const { pathname } = ctx.request.url;

  if (
    pathname === "/ws" &&
    ctx.request.headers.get("upgrade")?.toLowerCase() === "websocket"
  ) {
    const socket = await ctx.upgrade();
    manejarWsUbicacion(socket);
    return; // no next(): no pasar a routers HTTP
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
  authRouter, 
  superAdminRouter, 
  adminRouter,
  PruebasRouter,
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
