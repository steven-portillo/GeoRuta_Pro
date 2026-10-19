const UPLOADS_URL_PREFIX = "/uploads";

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2MB

export function generarRutaArchivo(archivo: File, subcarpeta: string): string {
  const extension = archivo.name.split(".").pop();
  const nombreUnico = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  return `${UPLOADS_URL_PREFIX}/${subcarpeta}/${nombreUnico}`;
}

function rutaADisco(rutaUrl: string): string {
  return `.${rutaUrl}`; // "/uploads/x.png" -> "./uploads/x.png"
}

export async function escribirArchivo(
  archivo: File,
  rutaUrl: string,
): Promise<void> {
  const rutaDisco = rutaADisco(rutaUrl);
  const carpeta = rutaDisco.substring(0, rutaDisco.lastIndexOf("/"));
  await Deno.mkdir(carpeta, { recursive: true });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  await Deno.writeFile(rutaDisco, bytes);
}

export async function eliminarArchivo(rutaUrl: string): Promise<void> {
  try {
    await Deno.remove(rutaADisco(rutaUrl));
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.error("Error al eliminar archivo:", error);
    }
  }
}

export function validarArchivo(archivo: File): string | null {
  if (!MIME_PERMITIDOS.includes(archivo.type)) {
    return "Formato de archivo no permitido";
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return "El archivo supera el tamaño máximo permitido";
  }
  return null;
}
