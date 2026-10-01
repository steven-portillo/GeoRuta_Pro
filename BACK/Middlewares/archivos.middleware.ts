// Middlewares/archivos.middleware.ts
import { Context } from "../Dependencies/dependencias.ts";

const TIPOS_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const DEFAULT_IMG = "default.png"; 

export const servirArchivos = async (
  ctx: Context,
  next: () => Promise<unknown>,
) => {
  const url = ctx.request.url.pathname;

  // Solo rutas bajo /Uploads/
  if (!url.startsWith("/Uploads/")) {
    await next();
    return;
  }

  // ?download=1 → fuerza descarga; si no, el navegador intenta mostrar (img/pdf)
  const forzarDescarga =
    ctx.request.url.searchParams.get("download") === "1" ||
    ctx.request.url.searchParams.get("download") === "true";

  let relativo = decodeURIComponent(url.replace(/^\/Uploads\//, ""));
  if (relativo === "default" || relativo === "") {
    relativo = DEFAULT_IMG;
  }

  // Evitar path traversal (../)
  if (relativo.includes("..")) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Ruta inválida" };
    return;
  }

  const rutaCompleta = `./Uploads/${relativo}`;
  const punto = rutaCompleta.lastIndexOf(".");
  const extension =
    punto >= 0 ? rutaCompleta.slice(punto).toLowerCase() : "";
  const mime = TIPOS_MIME[extension] ?? "application/octet-stream";

  try {
    const bytes = await Deno.readFile(rutaCompleta);
    const nombreArchivo = relativo.split("/").pop() ?? "archivo";

    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", mime);
    ctx.response.headers.set("Cache-Control", "private, max-age=3600");

    if (forzarDescarga) {
      ctx.response.headers.set(
        "Content-Disposition",
        `attachment; filename="${nombreArchivo}"`,
      );
    } else {
      // inline = ver en el navegador (PDF/imagen)
      ctx.response.headers.set(
        "Content-Disposition",
        `inline; filename="${nombreArchivo}"`,
      );
    }

    ctx.response.body = bytes;
  } catch {
    // Fallback solo para imágenes de perfil; PDFs de solicitud → 404
    if (extension !== ".pdf") {
      try {
        const bytes = await Deno.readFile(`./Uploads/${DEFAULT_IMG}`);
        ctx.response.status = 200;
        ctx.response.headers.set("Content-Type", "image/png");
        ctx.response.body = bytes;
        return;
      } catch {
        /* ignore */
      }
    }

    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Archivo no encontrado" };
  }
};