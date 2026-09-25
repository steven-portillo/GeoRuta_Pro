// helpers/archivos.ts

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2MB

export function generarRutaArchivo(archivo: File, subcarpeta: string): string {
  const extension = archivo.name.split(".").pop();
  const nombreUnico = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  return `./uploads/${subcarpeta}/${nombreUnico}`;
}

export async function escribirArchivo(
  archivo: File,
  ruta: string,
): Promise<void> {
  const carpeta = ruta.substring(0, ruta.lastIndexOf("/"));
  await Deno.mkdir(carpeta, { recursive: true });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  await Deno.writeFile(ruta, bytes);
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