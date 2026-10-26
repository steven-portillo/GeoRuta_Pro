import { Application, oakCors, send } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
import { empresaRouter } from "./Router/SuperAdmin/empresaRouter.ts";
import { clientesRouter } from "./Router/SuperAdmin/clienteRouter.ts";
import { categoriaRouter } from "./Router/Admin/categoriaRouter.ts";
import { productoRouter } from "./Router/Admin/productoRouter.ts";
import { inventarioRouter } from "./Router/Admin/inventarioRouter.ts";
import { proveedorRouter } from "./Router/Admin/proveedorRouter.ts";
import { pedidoRouter } from "./Router/Admin/pedidoRouter.ts";
import { perfilRouter } from "./Router/Perfil/perfilRouter.ts";
import { empresaPerfilRouter } from "./Router/Admin/empresaPerfilRouter.ts";
import { clienteRouter } from "./Router/Cliente/clienteRouter.ts";
import { pagoRouter } from "./Router/Pagos/pagoRouter.ts";
import { pedidoProveedorRouter } from "./Router/Proveedor/pedidoProveedorRouter.ts";
import { adminMapaRouter } from "./Router/Mapa/adminMapaRouter.ts";
import { clienteMapaRouter } from "./Router/Mapa/clienteMapaRouter.ts";
import { proveedorMapaRouter } from "./Router/Mapa/proveedorMapaRouter.ts";
import { manejarWsUbicacion } from "./ws/ubicacionHub.ts";

const app = new Application();
const uploadsUrl = new URL("./uploads/", import.meta.url);
await Deno.mkdir(uploadsUrl, { recursive: true });
const uploadsRoot = await Deno.realPath(uploadsUrl);

app.use(async (ctx, next) => {
  const { pathname } = ctx.request.url;

  if (
    pathname === "/ws" &&
    ctx.request.headers.get("upgrade")?.toLowerCase() === "websocket"
  ) {
    const origin = ctx.request.headers.get("origin");
    const allowedOrigin = Deno.env.get("FRONTEND_ORIGIN") ??
      "http://localhost:4321";
    if (origin && origin !== allowedOrigin) {
      ctx.response.status = 403;
      ctx.response.body = { success: false, message: "Origen no autorizado" };
      return;
    }

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
  }),
);

app.use(async (ctx, next) => {
  const pathname = ctx.request.url.pathname;
  if (pathname.startsWith("/uploads/")) {
    await send(ctx, pathname.slice("/uploads/".length), { root: uploadsRoot });
    return;
  }
  await next();
});

// Rutas
const routers = [
  pagoRouter,
  pedidoProveedorRouter,
  authRouter,
  empresaRouter,
  clientesRouter,
  categoriaRouter,
  productoRouter,
  inventarioRouter,
  proveedorRouter,
  pedidoRouter,
  perfilRouter,
  empresaPerfilRouter,
  clienteRouter,
  adminMapaRouter,
  clienteMapaRouter,
  proveedorMapaRouter,
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
