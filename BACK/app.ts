import { Application, oakCors, send } from "./Dependencies/dependencias.ts";
import { authRouter } from "./Router/Auth/authRouter.ts";
import { empresaRouter } from "./Router/SuperAdmin/empresaRouter.ts";
import { clienteRouter } from "./Router/SuperAdmin/clienteRouter.ts";
import { categoriaRouter } from "./Router/Admin/categoriaRouter.ts";
import { productoRouter } from "./Router/Admin/productoRouter.ts";
import { inventarioRouter } from "./Router/Admin/inventarioRouter.ts";
import { proveedorRouter } from "./Router/Admin/proveedorRouter.ts";
import { pedidoRouter } from "./Router/Admin/pedidoRouter.ts";
import { perfilRouter } from "./Router/Perfil/perfilRouter.ts";
import { empresaPerfilRouter } from "./Router/Admin/empresaPerfilRouter.ts";

const app = new Application();

// CORS
app.use(
  oakCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/uploads/")) {
    await send(ctx, ctx.request.url.pathname, { root: Deno.cwd() });
    return;
  }
  await next();
});

// Rutas
const routers = [
  authRouter,
  empresaRouter,
  clienteRouter,
  categoriaRouter,
  productoRouter,
  inventarioRouter,
  proveedorRouter,
  pedidoRouter,
  perfilRouter,
  empresaPerfilRouter,
];

routers.forEach((router) => {
  app.use(router.routes());
  app.use(router.allowedMethods());
});

const PORT = Number(Deno.env.get("PORT") || 8005);

console.log(` Servidor corriendo en http://localhost:${PORT}`);
await app.listen({ port: PORT });
