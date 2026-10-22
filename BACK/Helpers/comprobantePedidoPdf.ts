export interface ComprobantePedido {
  id_pedido: number;
  fecha_pedido: string;
  fecha_entrega: string;
  nombre_cliente: string;
  email_cliente: string;
  nombre_empresa: string;
  direccion_texto: string;
  metodo_pago: string;
  pago_confirmado: boolean;
  estado_pago?: string;
  total: number;
  productos: {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
}

function textoSeguro(value: string, maxLength = 72): string {
  return value.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapePdfText(value: string): string {
  return textoSeguro(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatoDinero(value: number): string {
  return `COP ${
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(value)
  }`;
}

function crearLineas(comprobante: ComprobantePedido): string[] {
  const lineas = [
    "GeoRuta",
    "COMPROBANTE DE PEDIDO - DOCUMENTO DE PRUEBA",
    `Pedido: #${comprobante.id_pedido}`,
    `Fecha del pedido: ${
      textoSeguro(comprobante.fecha_pedido) || "No disponible"
    }`,
    `Fecha de entrega: ${
      textoSeguro(comprobante.fecha_entrega) || "No disponible"
    }`,
    `Cliente: ${textoSeguro(comprobante.nombre_cliente) || "No disponible"}`,
    `Correo: ${textoSeguro(comprobante.email_cliente) || "No disponible"}`,
    `Empresa: ${textoSeguro(comprobante.nombre_empresa) || "No disponible"}`,
    `Direccion: ${textoSeguro(comprobante.direccion_texto) || "No disponible"}`,
    `Metodo de pago: ${
      comprobante.metodo_pago === "online" ? "En linea" : "Contra entrega"
    }`,
    `Estado del pago: ${
      comprobante.pago_confirmado ||
        comprobante.estado_pago === "aprobado"
        ? "Confirmado (simulacion)"
        : "Pendiente de confirmacion"
    }`,
    "",
    "DETALLE DE PRODUCTOS",
  ];

  for (const producto of comprobante.productos) {
    lineas.push(
      `${producto.cantidad} x ${textoSeguro(producto.nombre, 42)} | ${
        formatoDinero(producto.precio_unitario)
      } c/u | Subtotal: ${formatoDinero(producto.subtotal)}`,
    );
  }

  lineas.push("", `TOTAL DEL PEDIDO: ${formatoDinero(comprobante.total)}`);
  lineas.push(
    "",
    "Comprobante informativo para uso academico. No es una factura fiscal.",
  );
  return lineas;
}

function toAsciiBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function generarComprobantePedidoPdf(
  comprobante: ComprobantePedido,
): Uint8Array {
  if (
    !Number.isSafeInteger(comprobante.id_pedido) ||
    comprobante.id_pedido <= 0 ||
    !Number.isFinite(comprobante.total) ||
    comprobante.total < 0 ||
    comprobante.productos.length === 0 ||
    comprobante.productos.some((producto) =>
      !Number.isSafeInteger(producto.cantidad) || producto.cantidad <= 0 ||
      !Number.isFinite(producto.precio_unitario) ||
      producto.precio_unitario < 0 ||
      !Number.isFinite(producto.subtotal) || producto.subtotal < 0
    )
  ) {
    throw new Error("Los datos del comprobante del pedido no son válidos");
  }

  const lineas = crearLineas(comprobante);
  const lineasPorPagina = 48;
  const paginas: string[][] = [];
  for (let i = 0; i < lineas.length; i += lineasPorPagina) {
    paginas.push(lineas.slice(i, i + lineasPorPagina));
  }

  const objetos = new Map<number, string>();
  const pageObjectIds: number[] = [];
  objetos.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objetos.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  paginas.forEach((pagina, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);

    const commands = pagina.map((linea, lineIndex) => {
      const y = 750 - lineIndex * 14;
      return `BT /F1 10 Tf 50 ${y} Td (${escapePdfText(linea)}) Tj ET`;
    }).join("\n");
    const stream = `${commands}\n`;

    objetos.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objetos.set(
      contentId,
      `<< /Length ${
        toAsciiBytes(stream).length
      } >>\nstream\n${stream}endstream`,
    );
  });

  objetos.set(
    2,
    `<< /Type /Pages /Kids [${
      pageObjectIds.map((id) => `${id} 0 R`).join(" ")
    }] ` +
      `/Count ${pageObjectIds.length} >>`,
  );

  const objectCount = Math.max(...objetos.keys());
  let pdf = "%PDF-1.4\n";
  const offsets = new Array<number>(objectCount + 1).fill(0);
  for (let id = 1; id <= objectCount; id++) {
    const body = objetos.get(id);
    if (!body) continue;
    offsets[id] = toAsciiBytes(pdf).length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = toAsciiBytes(pdf).length;
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= objectCount; id++) {
    pdf += offsets[id] === 0
      ? "0000000000 00000 f \n"
      : `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return toAsciiBytes(pdf);
}

export function pdfBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}
