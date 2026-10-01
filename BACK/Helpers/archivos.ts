// helpers/archivos.ts

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 5MB

// helpers/archivos.ts

// Ruta FÍSICA para escribir en disco (con ./Uploads/ al inicio)
export function rutaFisicaArchivo(subcarpeta: string, nombreUnico: string): string {
  return `./Uploads/${subcarpeta}/${nombreUnico}`;
}

// Ruta RELATIVA para guardar en la base de datos — sin "./Uploads/", 
// solo "subcarpeta/nombre.ext". El middleware y el frontend ya saben
// anteponer "/Uploads/" cuando construyen la URL pública.
export function generarNombreUnico(archivo: File): string {
  const extension = archivo.name.split(".").pop();
  return `${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

export async function escribirArchivo(archivo: File, rutaFisica: string): Promise<void> {
  const carpeta = rutaFisica.substring(0, rutaFisica.lastIndexOf("/"));
  await Deno.mkdir(carpeta, { recursive: true });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  await Deno.writeFile(rutaFisica, bytes);
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