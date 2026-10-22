import {
  generarComprobantePedidoPdf,
  pdfBase64,
} from "./comprobantePedidoPdf.ts";

Deno.test("Genera PDF de comprobante con resumen de compra", () => {
  const pdf = generarComprobantePedidoPdf({
    id_pedido: 27,
    fecha_pedido: "2026-10-22 10:00:00",
    fecha_entrega: "2026-10-22 11:00:00",
    nombre_cliente: "Ana Cliente",
    email_cliente: "ana@example.com",
    nombre_empresa: "Tienda GeoRuta",
    direccion_texto: "Calle 10 # 5-20",
    metodo_pago: "contra_entrega",
    pago_confirmado: true,
    total: 5400,
    productos: [{
      nombre: "Cafe (molido)",
      cantidad: 2,
      precio_unitario: 2700,
      subtotal: 5400,
    }],
  });

  const content = new TextDecoder().decode(pdf);
  if (
    !content.startsWith("%PDF-1.4") ||
    !content.includes("COMPROBANTE DE PEDIDO") ||
    !content.includes("Cafe \\(molido\\)") ||
    !content.includes("TOTAL DEL PEDIDO: COP 5.400") ||
    !content.endsWith("%%EOF")
  ) {
    throw new Error("El PDF del comprobante no contiene el resumen esperado");
  }
  if (!pdfBase64(pdf).startsWith("JVBERi0xLjQ")) {
    throw new Error("El PDF no se codificó correctamente para adjuntarlo");
  }
});
