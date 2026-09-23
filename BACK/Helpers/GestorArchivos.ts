const EXTENSIONES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".webp"];

// valida la extension del archivo; lanza error si no esta permitida
function obtenerExtensionValida(archivo: File): string {
  const extension = archivo.name.slice(archivo.name.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
    throw new Error("Formato de imagen no permitido");
  }
  return extension;
}

// valida que el archivo no supere el tamano maximo (en bytes)
function validarTamano(archivo: File, maxBytes: number) {
  if (archivo.size > maxBytes) {
    throw new Error(`La imagen no puede superar ${Math.round(maxBytes / (1024 * 1024))}MB`);
  }
}

// escribe el archivo en disco dentro de la carpeta indicada
async function guardarArchivo(archivo: File, carpeta: string, nombreArchivo: string): Promise<void> {
  await Deno.mkdir(carpeta, { recursive: true });
  const buffer = new Uint8Array(await archivo.arrayBuffer());
  await Deno.writeFile(`${carpeta}/${nombreArchivo}`, buffer);
}

// guarda la foto de perfil del usuario; usa nombre fijo (usuario_{id}) para sobrescribir
// la anterior automaticamente, igual que hacia el SubirFoto original
export async function guardarFotoPerfil(archivo: File, idUsuario: number): Promise<string> {
  const extension = obtenerExtensionValida(archivo);
  validarTamano(archivo, 2 * 1024 * 1024);

  const nombreArchivo = `usuario_${idUsuario}${extension}`;
  await guardarArchivo(archivo, "./public/img/perfiles", nombreArchivo);

  return `/img/perfiles/${nombreArchivo}`;
}

// guarda el logo que el admin sube desde su perfil (distinto del que se sube en el
// registro publico de empresa, que usa uuid porque ahi todavia no existe idUsuario)
export async function guardarLogoEmpresaAdmin(archivo: File, idUsuario: number): Promise<string> {
  const extension = obtenerExtensionValida(archivo);
  validarTamano(archivo, 2 * 1024 * 1024);

  const nombreArchivo = `empresa_admin_${idUsuario}${extension}`;
  await guardarArchivo(archivo, "./public/img/logos", nombreArchivo);

  return `/img/logos/${nombreArchivo}`;
}

// imagen de producto — nombre uuid porque puede haber muchos productos por empresa
export async function guardarImagenProducto(archivo: File): Promise<string> {
  const extension = obtenerExtensionValida(archivo);
  validarTamano(archivo, 3 * 1024 * 1024);
  const nombreArchivo = `prod_${crypto.randomUUID()}${extension}`;
  await guardarArchivo(archivo, "./public/img/productos", nombreArchivo);
  return `/img/productos/${nombreArchivo}`;
}