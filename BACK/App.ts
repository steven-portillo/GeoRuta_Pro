import { Application, oakCors, send } from "./Dependencies/Dependencias.ts";
import authRoutes from "./Routes/Auth_routes.ts";
import rastreoRoutes from "./Routes/RastreoRoutes.ts";
import registroRoutes from "./Routes/RegistroRoutes.ts";
import registroEmpresaRoutes from "./Routes/RegistroEmpresaRoutes.ts";
import adminPerfilRoutes from "./Routes/Admin/AdminPerfilRoutes.ts";
import adminProductosRoutes from "./Routes/Admin/AdminProductosRoutes.ts";
import adminPedidosRoutes from "./Routes/Admin/AdminPedidosRoutes.ts";
import adminRepartidoresRoutes from "./Routes/Admin/AdminRepartidoresRoutes.ts";
import adminDashboardRoutes from "./Routes/Admin/AdminDashboardRoutes.ts";
import adminPagosRoutes from "./Routes/Admin/AdminPagosRoutes.ts";
import proveedorPerfilRoutes from "./Routes/Proveedor/ProveedorPerfilRoutes.ts";
import proveedorDashboardRoutes from "./Routes/Proveedor/ProveedorDashboardRoutes.ts";
import proveedorPedidosRoutes from "./Routes/Proveedor/ProveedorPedidosRoutes.ts";
import proveedorNotificacionesRoutes from "./Routes/Proveedor/ProveedorNotificacionesRoutes.ts";
import proveedorUbicacionRoutes from "./Routes/Proveedor/ProveedorUbicacionRoutes.ts";
import clientePerfilRoutes from "./Routes/Cliente/ClientePerfilRoutes.ts";
import clienteCatalogoRoutes from "./Routes/Cliente/ClienteCatalogoRoutes.ts";
import clientePedidosRoutes from "./Routes/Cliente/ClientePedidosRoutes.ts";
import clienteResenasRoutes from "./Routes/Cliente/ClienteResenasRoutes.ts";
import pagoRoutes from "./Routes/PagoRoutes.ts";
import SuperAdminEmpresasRoutes from "./Routes/SuperAdmin/SuperAdminEmpresasRoutes.ts";
import superadminperfilroutes from "./Routes/SuperAdmin/SuperAdminPerfilRoutes.ts";

const app = new Application();

app.use(oakCors({ origin: "http://localhost:4321", credentials: true })); // ajusta al puerto de tu Astro

// sirve los archivos estaticos (logos/fotos/imagenes de productos) que guarda GestorArchivos.ts
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/img/")) {
    await send(ctx, ctx.request.url.pathname, { root: "./public" });
  } else {
    await next();
  }
});

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(rastreoRoutes.routes());
app.use(rastreoRoutes.allowedMethods());

app.use(registroRoutes.routes());
app.use(registroRoutes.allowedMethods());

app.use(registroEmpresaRoutes.routes());
app.use(registroEmpresaRoutes.allowedMethods());

app.use(adminPerfilRoutes.routes());
app.use(adminPerfilRoutes.allowedMethods());

app.use(adminProductosRoutes.routes());
app.use(adminProductosRoutes.allowedMethods());

app.use(adminPedidosRoutes.routes());
app.use(adminPedidosRoutes.allowedMethods());

app.use(adminRepartidoresRoutes.routes());
app.use(adminRepartidoresRoutes.allowedMethods());

app.use(adminDashboardRoutes.routes());
app.use(adminDashboardRoutes.allowedMethods());

app.use(adminPagosRoutes.routes());
app.use(adminPagosRoutes.allowedMethods());

app.use(proveedorPerfilRoutes.routes());
app.use(proveedorPerfilRoutes.allowedMethods());

app.use(proveedorDashboardRoutes.routes());
app.use(proveedorDashboardRoutes.allowedMethods());

app.use(proveedorPedidosRoutes.routes());
app.use(proveedorPedidosRoutes.allowedMethods());

app.use(proveedorNotificacionesRoutes.routes());
app.use(proveedorNotificacionesRoutes.allowedMethods());

app.use(proveedorUbicacionRoutes.routes());
app.use(proveedorUbicacionRoutes.allowedMethods());

app.use(clientePerfilRoutes.routes());
app.use(clientePerfilRoutes.allowedMethods());

app.use(clienteCatalogoRoutes.routes());
app.use(clienteCatalogoRoutes.allowedMethods());

app.use(clientePedidosRoutes.routes());
app.use(clientePedidosRoutes.allowedMethods());

app.use(clienteResenasRoutes.routes());
app.use(clienteResenasRoutes.allowedMethods());

app.use(pagoRoutes.routes());
app.use(pagoRoutes.allowedMethods());

app.use(SuperAdminEmpresasRoutes.routes());
app.use(SuperAdminEmpresasRoutes.allowedMethods());

app.use(superadminperfilroutes.routes());
app.use(superadminperfilroutes.allowedMethods());


//cambios pendientes
const PORT = 8000;
console.log(`Servidor escuchando en http://localhost:${PORT}`);
await app.listen({ port: PORT });