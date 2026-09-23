import { SMTPClient } from "../Dependencies/Dependencias.ts";
import { Pago } from "../Models/Pago.model.ts";

// arma el HTML del recibo y lo envia por SMTP; nunca lanza — el recibo jamas debe romper el flujo de pago
export async function enviarReciboEmail(idPedido: number): Promise<void> {
  try {
    const ObjPago = new Pago();
    const resultado = await ObjPago.ObtenerDatosParaRecibo(idPedido);
    if (!resultado.success || !resultado.data) return;

    const { email, nombre, empresa, direccion, total, fecha, items } = resultado.data;

    let subtotalProductos = 0;
    const filas = items
      .map((item) => {
        const subtotal = item.cantidad * item.precioUnitario;
        subtotalProductos += subtotal;
        return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">${item.producto}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.cantidad}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">$${item.precioUnitario.toLocaleString("es-CO")} COP</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:500;">$${subtotal.toLocaleString("es-CO")} COP</td>
        </tr>`;
      })
      .join("");

    const envio = total - subtotalProductos;
    const fechaFormateada = new Date(fecha).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#3b82f6;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">GeoRuta</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Recibo de compra</p>
          </div>
          <div style="padding:28px 32px 0;">
            <p style="margin:0 0 4px;color:#1e293b;font-size:15px;">Hola, <strong>${nombre}</strong></p>
            <p style="margin:0;color:#64748b;font-size:14px;">Tu pago fue procesado exitosamente. Este es el resumen de tu pedido.</p>
          </div>
          <div style="margin:24px 32px 0;background:#f8fafc;border-radius:8px;padding:16px 20px;border:1px solid #e2e8f0;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="color:#64748b;padding:4px 0;">Número de pedido</td><td style="text-align:right;color:#1e293b;font-weight:500;">#PED-${idPedido}</td></tr>
              <tr><td style="color:#64748b;padding:4px 0;">Fecha</td><td style="text-align:right;color:#1e293b;">${fechaFormateada}</td></tr>
              <tr><td style="color:#64748b;padding:4px 0;">Empresa</td><td style="text-align:right;color:#1e293b;">${empresa}</td></tr>
              <tr><td style="color:#64748b;padding:4px 0;">Dirección de entrega</td><td style="text-align:right;color:#1e293b;">${direccion}</td></tr>
            </table>
          </div>
          <div style="margin:24px 32px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:10px 12px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">Producto</th>
                  <th style="padding:10px 12px;text-align:center;color:#475569;font-size:12px;text-transform:uppercase;">Cant.</th>
                  <th style="padding:10px 12px;text-align:right;color:#475569;font-size:12px;text-transform:uppercase;">Precio</th>
                  <th style="padding:10px 12px;text-align:right;color:#475569;font-size:12px;text-transform:uppercase;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
          <div style="margin:0 32px;border-top:1px solid #e2e8f0;padding:16px 0;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#64748b;padding:4px 0;">Subtotal productos</td><td style="text-align:right;color:#1e293b;">$${subtotalProductos.toLocaleString("es-CO")} COP</td></tr>
              <tr><td style="color:#64748b;padding:4px 0;">Envío</td><td style="text-align:right;color:#1e293b;">$${envio.toLocaleString("es-CO")} COP</td></tr>
              <tr><td style="color:#1e293b;font-weight:600;font-size:16px;padding:10px 0 4px;">Total pagado</td><td style="text-align:right;color:#3b82f6;font-weight:600;font-size:16px;padding:10px 0 4px;">$${total.toLocaleString("es-CO")} COP</td></tr>
            </table>
          </div>
          <div style="margin:24px 0 0;background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">Este correo es un comprobante automático de GeoRuta. No respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>`;

    const smtp = new SMTPClient({
  connection: {
    hostname: Deno.env.get("SMTP_HOST") ?? "",
    port: Number(Deno.env.get("SMTP_PORT") ?? 587),
    tls: false, // 587 = STARTTLS, no TLS directo — tls:true es solo para el puerto 465
    auth: {
      username: Deno.env.get("SMTP_USER") ?? "",
      password: Deno.env.get("SMTP_PASSWORD") ?? "",
    },
  },
});

    await smtp.send({
      from: Deno.env.get("SMTP_USER") ?? "",
      to: email,
      subject: `Recibo de tu pedido #PED-${idPedido} — GeoRuta`,
      content: "Tu recibo está disponible en este correo.",
      html,
    });

    await smtp.close();
  } catch (error) {
    // el recibo no debe bloquear el flujo de pago si falla
    console.error("Error enviando recibo:", error);
  }
}