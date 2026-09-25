import { defineMiddleware } from "astro:middleware";
import { verificarTokenAstro } from "./lib/jwt";

const RUTAS_PUBLICAS = ["/", "/auth/login", "/auth/signin", "/auth/signin-empresa", "/auth/password"];


export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, redirect, locals } = context;
    const path = url.pathname;

    if (path.startsWith("/api/")) {
        return next();
    }

    const token = cookies.get("token")?.value;
    const usuario = await verificarTokenAstro(token);
    locals.usuario = usuario;

    const esPublica = RUTAS_PUBLICAS.some(
        (r) => path === r || path.startsWith(r + "/"),
    );

    if (esPublica) {
        if (usuario) {
            const rol = usuario.rol?.toUpperCase();
            if (rol === "SUPERADMIN") return redirect("/super-admin/");
            if (rol === "ADMIN") return redirect("/admin/");
            if (rol === "PROVEEDOR") return redirect("/repartidor/");
            if (rol === "CLIENTE") return redirect("/cliente/");
            return redirect("/");
        }
        return next();
    }


    if (!usuario) {
        return redirect("/");
    }

    if (path.startsWith("/super-admin") && usuario.rol !== "SUPERADMIN") {
        cookies.delete("token", { path: "/" });
        return redirect("/");
    }
    if (path.startsWith("/admin") && usuario.rol !== "ADMIN") {
        cookies.delete("token", { path: "/" });
        return redirect("/");
    }
    if (path.startsWith("/repartidor") && usuario.rol !== "PROVEEDOR") {
        cookies.delete("token", { path: "/" });
        return redirect("/");
    }
    if (path.startsWith("/cliente") && usuario.rol !== "CLIENTE") {
        cookies.delete("token", { path: "/" });
        return redirect("/");
    }

    return next();
});