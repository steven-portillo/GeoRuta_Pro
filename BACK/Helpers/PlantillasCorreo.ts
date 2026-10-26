// plantillas de correo de georuta. html con tablas y estilos inline,
// que es lo que se ve bien en gmail, outlook y moviles.
// los correos son solo informativos: sin botones ni enlaces.

const MARCA = {
  nombre: "GeoRuta",
  colorPrimario: "#1d4ed8",
  colorSecundario: "#2563eb",
};

export interface PlantillaCorreo {
  asunto: string;
  html: string;
  texto: string;
}

// todo dato que venga de un usuario debe pasar por aqui antes de ir al html
function escapeHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// dinero con el mismo formato del recibo: $18.500 COP
function formatoCop(valor: number): string {
  return `$${Number(valor).toLocaleString("es-CO")} COP`;
}

// el id se muestra igual que en la app y en las notificaciones: #PED-12
function codigoPedido(idPedido: number): string {
  return `#PED-${idPedido}`;
}

function nombreMetodoPago(metodoPago: string): string {
  return metodoPago === "contra_entrega" ? "Contra entrega" : "Pago en línea";
}

// layout compartido por todas las plantillas. "contenido" debe llegar
// ya escapado. cuando este el logo, solo cambia el bloque del encabezado.
function layoutBase(titulo: string, preheader: string, contenido: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td align="center" bgcolor="${MARCA.colorPrimario}" style="padding:28px 24px;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;color:#ffffff;">${MARCA.nombre}</span>
            </td>
          </tr>
          <tr>
            <td bgcolor="${MARCA.colorSecundario}" style="height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:${MARCA.colorPrimario};">${escapeHtml(titulo)}</h1>
              ${contenido}
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#f8fafc" style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #e2e8f0;">
              ${MARCA.nombre} &middot; Correo automático, por favor no respondas a este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// correo 1: el cliente se registra (o entra por primera vez con google). llega al cliente.
export function plantillaBienvenidaCliente(nombreCliente: string): PlantillaCorreo {
  const titulo = `¡Bienvenido a ${MARCA.nombre}!`;

  const html = layoutBase(
    titulo,
    "Tu cuenta fue creada correctamente.",
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreCliente)}</strong>,</p>
      <p style="margin:0;">Tu cuenta fue creada correctamente. Ya puedes iniciar sesión y empezar a comprar.</p>
    `,
  );

  const texto = [
    `Hola ${nombreCliente},`,
    "",
    "Tu cuenta fue creada correctamente. Ya puedes iniciar sesión y empezar a comprar.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// correo 2: recuperacion de contraseña. el proyecto usa un codigo de 6 digitos
// (no un enlace) y la vigencia viene de MINUTOS_VIGENCIA del modelo.
export function plantillaRecuperacionPassword(
  nombreUsuario: string,
  codigo: string,
  minutosVigencia: number,
): PlantillaCorreo {
  const titulo = "Restablece tu contraseña de GeoRuta";

  const html = layoutBase(
    titulo,
    "Solicitaste restablecer la contraseña de tu cuenta.",
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreUsuario)}</strong>,</p>
      <p style="margin:0 0 12px 0;">Usa este código para crear una nueva contraseña. Vence en ${minutosVigencia} minutos y solo puede utilizarse una vez:</p>
      <p style="margin:0 0 16px 0;padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;color:#1e293b;">${escapeHtml(codigo)}</p>
      <p style="margin:0;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña actual no cambiará.</p>
    `,
  );

  const texto = [
    `Hola ${nombreUsuario},`,
    "",
    "Solicitaste restablecer la contraseña de tu cuenta.",
    "",
    `Código de un solo uso (vence en ${minutosVigencia} minutos): ${codigo}`,
    "",
    "Si no solicitaste este cambio, ignora este mensaje.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

export interface PedidoCorreoItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

// los nombres coinciden con lo que devuelve Pedido.ObtenerDatosParaCorreo()
export interface PedidoCorreoDatos {
  idPedido: number;
  nombreCliente: string;
  emailCliente: string;
  nombreEmpresa: string;
  total: number;
  metodoPago: string;
  direccion: string;
  productos: PedidoCorreoItem[];
  nombreRepartidor?: string;
}

function resumenPedido(pedido: PedidoCorreoDatos) {
  const subtotalProductos = pedido.productos.reduce((suma, producto) => suma + producto.subtotal, 0);
  // el total del pedido incluye el envio fijo, que no es un producto
  const envio = pedido.total - subtotalProductos;

  const filas = pedido.productos.map((producto) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(producto.nombre)}</td>
      <td align="center" style="padding:8px;border-bottom:1px solid #e2e8f0;">${producto.cantidad}</td>
      <td align="right" style="padding:8px;border-bottom:1px solid #e2e8f0;">${formatoCop(producto.subtotal)}</td>
    </tr>`).join("");

  const textoProductos = pedido.productos.map((producto) =>
    `- ${producto.nombre} x ${producto.cantidad}: ${formatoCop(producto.subtotal)}`
  );

  const filaEnvioHtml = envio > 0
    ? `<p style="margin:16px 0 4px 0;"><strong>Envío:</strong> ${formatoCop(envio)}</p>`
    : "";
  const filaTotalMargen = envio > 0 ? "4px 0" : "16px 0 4px 0";

  return {
    html: `
      <p style="margin:0 0 12px 0;">Pedido <strong>${codigoPedido(pedido.idPedido)}</strong> de <strong>${escapeHtml(pedido.nombreEmpresa)}</strong></p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th align="left" style="padding:8px;border-bottom:2px solid #cbd5e1;">Producto</th>
            <th align="center" style="padding:8px;border-bottom:2px solid #cbd5e1;">Cantidad</th>
            <th align="right" style="padding:8px;border-bottom:2px solid #cbd5e1;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      ${filaEnvioHtml}
      <p style="margin:${filaTotalMargen};"><strong>Total:</strong> ${formatoCop(pedido.total)}</p>
      <p style="margin:4px 0;"><strong>Pago:</strong> ${escapeHtml(nombreMetodoPago(pedido.metodoPago))}</p>
      <p style="margin:4px 0;"><strong>Dirección:</strong> ${escapeHtml(pedido.direccion)}</p>
    `,
    texto: [
      `Pedido ${codigoPedido(pedido.idPedido)} de ${pedido.nombreEmpresa}`,
      ...textoProductos,
      ...(envio > 0 ? [`Envío: ${formatoCop(envio)}`] : []),
      `Total: ${formatoCop(pedido.total)}`,
      `Pago: ${nombreMetodoPago(pedido.metodoPago)}`,
      `Dirección: ${pedido.direccion}`,
    ].join("\n"),
  };
}

// correo 3: el cliente crea un pedido. llega al cliente.
// en pago online el pedido se crea antes de pagar; el recibo (EnviarRecibo.ts)
// llega despues, cuando wompi aprueba el pago.
export function plantillaConfirmacionPedidoCliente(pedido: PedidoCorreoDatos): PlantillaCorreo {
  const titulo = `Recibimos tu pedido ${codigoPedido(pedido.idPedido)}`;
  const resumen = resumenPedido(pedido);
  const mensajePago = pedido.metodoPago === "online"
    ? "Cuando se confirme tu pago en línea te enviaremos el recibo."
    : "El pago se realizará contra entrega.";

  return {
    asunto: titulo,
    html: layoutBase(
      titulo,
      `Tu pedido en ${pedido.nombreEmpresa} fue registrado.`,
      `<p style="margin:0 0 16px 0;">Hola <strong>${escapeHtml(pedido.nombreCliente)}</strong>, recibimos tu pedido. ${escapeHtml(mensajePago)}</p>${resumen.html}`,
    ),
    texto: [
      `Hola ${pedido.nombreCliente}, recibimos tu pedido.`,
      mensajePago,
      resumen.texto,
      `-- ${MARCA.nombre}`,
    ].join("\n\n"),
  };
}

// correo 4: el pedido pasa a "Cancelado". llega al cliente.
// el proyecto todavia no guarda el motivo, por eso es opcional.
export function plantillaCancelacionPedidoCliente(
  pedido: PedidoCorreoDatos,
  motivo?: string,
): PlantillaCorreo {
  const titulo = `Pedido ${codigoPedido(pedido.idPedido)} cancelado`;
  const notaMotivo = motivo ? `<p style="margin:0 0 12px 0;"><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>` : "";

  return {
    asunto: titulo,
    html: layoutBase(
      titulo,
      `El pedido ${codigoPedido(pedido.idPedido)} fue cancelado.`,
      `<p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(pedido.nombreCliente)}</strong>, te confirmamos que tu pedido de <strong>${escapeHtml(pedido.nombreEmpresa)}</strong> fue cancelado.</p>${notaMotivo}<p style="margin:0;">Si tienes dudas, comunícate con la empresa.</p>`,
    ),
    texto: [
      `Hola ${pedido.nombreCliente}, tu pedido ${codigoPedido(pedido.idPedido)} de ${pedido.nombreEmpresa} fue cancelado.`,
      ...(motivo ? [`Motivo: ${motivo}`] : []),
      "Si tienes dudas, comunícate con la empresa.",
      `-- ${MARCA.nombre}`,
    ].join("\n\n"),
  };
}

// correo 5: el admin asigna un repartidor al pedido. llega al cliente.
export function plantillaAsignacionPedidoCliente(pedido: PedidoCorreoDatos): PlantillaCorreo {
  const titulo = `Actualización del pedido ${codigoPedido(pedido.idPedido)}`;
  const repartidor = pedido.nombreRepartidor
    ? ` El repartidor asignado es ${escapeHtml(pedido.nombreRepartidor)}.`
    : "";

  return {
    asunto: titulo,
    html: layoutBase(
      titulo,
      `Tu pedido de ${pedido.nombreEmpresa} ya tiene repartidor.`,
      `<p style="margin:0;">Hola <strong>${escapeHtml(pedido.nombreCliente)}</strong>, tu pedido de <strong>${escapeHtml(pedido.nombreEmpresa)}</strong> ya fue aprobado y tiene un repartidor asignado.${repartidor} Te avisaremos cuando inicie la ruta.</p>`,
    ),
    texto: [
      `Hola ${pedido.nombreCliente},`,
      `Tu pedido ${codigoPedido(pedido.idPedido)} de ${pedido.nombreEmpresa} ya fue aprobado y tiene un repartidor asignado.`,
      ...(pedido.nombreRepartidor ? [`Repartidor: ${pedido.nombreRepartidor}`] : []),
      "Te avisaremos cuando inicie la ruta.",
      `-- ${MARCA.nombre}`,
    ].join("\n\n"),
  };
}

// correo 6: el pedido pasa a "En transito" o "Entregado". llega al cliente.
// el codigo de entrega NO va en el correo: solo existe en pedidos contra entrega
// y el cliente lo ve en el detalle de su pedido.
export function plantillaEstadoPedidoCliente(
  pedido: PedidoCorreoDatos,
  estado: "En transito" | "Entregado",
): PlantillaCorreo {
  const enRuta = estado === "En transito";
  const titulo = enRuta
    ? `Tu pedido ${codigoPedido(pedido.idPedido)} está en camino`
    : `Tu pedido ${codigoPedido(pedido.idPedido)} fue entregado`;

  let mensaje: string;
  if (enRuta) {
    mensaje = pedido.metodoPago === "contra_entrega"
      ? "El repartidor inició la ruta de entrega. Puedes seguirlo en vivo desde Mis pedidos. Cuando llegue, entrégale el código de 6 dígitos que aparece en el detalle de tu pedido."
      : "El repartidor inició la ruta de entrega. Puedes seguirlo en vivo desde Mis pedidos.";
  } else {
    mensaje = "Tu pedido figura como entregado. Gracias por comprar en GeoRuta. Si quieres, cuéntanos qué te pareció dejando una reseña desde tu cuenta.";
  }

  return {
    asunto: titulo,
    html: layoutBase(
      titulo,
      enRuta ? "El repartidor ya va en camino." : "Tu pedido fue entregado.",
      `<p style="margin:0;">Hola <strong>${escapeHtml(pedido.nombreCliente)}</strong>, ${escapeHtml(mensaje)}</p>`,
    ),
    texto: [
      `Hola ${pedido.nombreCliente},`,
      mensaje,
      `Pedido ${codigoPedido(pedido.idPedido)} de ${pedido.nombreEmpresa}`,
      `-- ${MARCA.nombre}`,
    ].join("\n\n"),
  };
}

// correo 7: la empresa se registra. llega al admin que se registro.
export function plantillaRegistroEmpresaAdmin(nombreAdmin: string, nombreEmpresa: string): PlantillaCorreo {
  const titulo = "Registro recibido";

  const html = layoutBase(
    titulo,
    "Tu cuenta está pendiente de activación.",
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreAdmin)}</strong>,</p>
      <p style="margin:0 0 12px 0;">La empresa <strong>${escapeHtml(nombreEmpresa)}</strong> fue registrada en ${MARCA.nombre}. Tu cuenta está pendiente de activación, por lo que todavía no puedes iniciar sesión.</p>
      <p style="margin:0;">Te avisaremos por este medio cuando esté activa.</p>
    `,
  );

  const texto = [
    `Hola ${nombreAdmin},`,
    "",
    `La empresa ${nombreEmpresa} fue registrada en ${MARCA.nombre}. Tu cuenta está pendiente de activación, por lo que todavía no puedes iniciar sesión.`,
    "",
    "Te avisaremos por este medio cuando esté activa.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// correo 8: la empresa se registra. llega al superadmin.
export function plantillaNuevaEmpresaSuperAdmin(
  nombreEmpresa: string,
  nombreAdmin: string,
  apellidoAdmin: string,
  emailAdmin: string,
): PlantillaCorreo {
  const titulo = "Nueva empresa pendiente de activación";
  const nombreCompleto = `${nombreAdmin} ${apellidoAdmin}`.trim();

  const fila = (etiqueta: string, valor: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;font-weight:bold;color:#475569;vertical-align:top;">${etiqueta}</td>
      <td style="padding:6px 0;">${escapeHtml(valor)}</td>
    </tr>`;

  const html = layoutBase(
    titulo,
    `${nombreEmpresa} espera ser activada.`,
    `
      <p style="margin:0 0 16px 0;">Se registró una nueva empresa que está pendiente de activación.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;">
        ${fila("Empresa", nombreEmpresa)}
        ${fila("Administrador", nombreCompleto)}
        ${fila("Correo", emailAdmin)}
      </table>
    `,
  );

  const texto = [
    "Se registró una nueva empresa que está pendiente de activación.",
    "",
    `Empresa: ${nombreEmpresa}`,
    `Administrador: ${nombreCompleto}`,
    `Correo: ${emailAdmin}`,
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// correo 9: un admin crea un repartidor (rol proveedor). llega al repartidor.
// no lleva contraseña: el admin se la entrega por fuera del sistema.
export function plantillaBienvenidaRepartidor(nombreRepartidor: string, nombreEmpresa: string): PlantillaCorreo {
  const titulo = `Tu cuenta de repartidor en ${MARCA.nombre}`;

  const html = layoutBase(
    titulo,
    `Fuiste registrado como repartidor de ${nombreEmpresa}.`,
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreRepartidor)}</strong>,</p>
      <p style="margin:0 0 12px 0;">Fuiste registrado como repartidor de la empresa <strong>${escapeHtml(nombreEmpresa)}</strong> en ${MARCA.nombre}.</p>
      <p style="margin:0;">Tu administrador te entregará tus datos de acceso.</p>
    `,
  );

  const texto = [
    `Hola ${nombreRepartidor},`,
    "",
    `Fuiste registrado como repartidor de la empresa ${nombreEmpresa} en ${MARCA.nombre}.`,
    "",
    "Tu administrador te entregará tus datos de acceso.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// correo 10: el superadmin activa la empresa. llega al admin.
export function plantillaEmpresaActivada(nombreAdmin: string, nombreEmpresa: string): PlantillaCorreo {
  const titulo = "Tu empresa fue activada";

  const html = layoutBase(
    titulo,
    `${nombreEmpresa} ya está activa.`,
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreAdmin)}</strong>,</p>
      <p style="margin:0;">La empresa <strong>${escapeHtml(nombreEmpresa)}</strong> fue activada en ${MARCA.nombre}. Ya puedes iniciar sesión.</p>
    `,
  );

  const texto = [
    `Hola ${nombreAdmin},`,
    "",
    `La empresa ${nombreEmpresa} fue activada en ${MARCA.nombre}. Ya puedes iniciar sesión.`,
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// correo 11: el superadmin desactiva la empresa. llega al admin.
export function plantillaEmpresaDesactivada(nombreAdmin: string, nombreEmpresa: string): PlantillaCorreo {
  const titulo = "Tu empresa fue desactivada";

  const html = layoutBase(
    titulo,
    `${nombreEmpresa} fue desactivada.`,
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreAdmin)}</strong>,</p>
      <p style="margin:0;">La empresa <strong>${escapeHtml(nombreEmpresa)}</strong> fue desactivada en ${MARCA.nombre} y ya no puedes iniciar sesión. Si crees que es un error, comunícate con el administrador de la plataforma.</p>
    `,
  );

  const texto = [
    `Hola ${nombreAdmin},`,
    "",
    `La empresa ${nombreEmpresa} fue desactivada en ${MARCA.nombre} y ya no puedes iniciar sesión. Si crees que es un error, comunícate con el administrador de la plataforma.`,
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}