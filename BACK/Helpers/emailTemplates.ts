// Plantillas de correo de GeoRuta. HTML con tablas y estilos inline,
// que es lo que se ve bien en Gmail, Outlook y móviles.
// Los correos son solo informativos: sin botones ni enlaces.

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

export function plantillaCodigoRecuperacion(codigo: string): PlantillaCorreo {
  const asunto = "Código para recuperar tu contraseña";
  const html = layoutBase(
    "Recupera tu contraseña",
    "Tu código de recuperación vence en 10 minutos.",
    `<p style="margin:0 0 12px 0;">Usa este código para verificar tu identidad:</p>
      <p style="margin:0 0 16px 0;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:${MARCA.colorPrimario};">${escapeHtml(codigo)}</p>
      <p style="margin:0;">El código vence en 10 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
  );
  const texto = [
    "Usa este código para recuperar tu contraseña:",
    codigo,
    "",
    "El código vence en 10 minutos. Si no solicitaste este cambio, ignora este correo.",
  ].join("\n");
  return { asunto, html, texto };
}

// Todo dato que venga de un usuario debe pasar por aquí antes de ir al HTML.
function escapeHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Layout compartido por todas las plantillas. "contenido" debe llegar
// ya escapado. Cuando esté el logo, solo cambia el bloque del encabezado.
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
              ${MARCA.nombre} &middot; ¿Dudas? Responde a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Correo 1: el cliente se registra. Llega al cliente.
export function plantillaBienvenidaCliente(
  nombreCliente: string,
): PlantillaCorreo {
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

// Correo 2: la empresa se registra. Llega al admin que se registró.
export function plantillaRegistroEmpresaAdmin(
  nombreAdmin: string,
  nombreEmpresa: string,
): PlantillaCorreo {
  const titulo = "Registro recibido";

  const html = layoutBase(
    titulo,
    "Tu cuenta está pendiente de activación.",
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreAdmin)}</strong>,</p>
      <p style="margin:0 0 12px 0;">La empresa <strong>${escapeHtml(nombreEmpresa)}</strong> fue registrada en ${MARCA.nombre}. Tu cuenta está pendiente de activación, por lo que todavía no puedes iniciar sesión.</p>
      <p style="margin:0;">Te avisaremos por este medio cuando esté activa. Si pasa un tiempo y no tienes respuesta, responde a este correo para solicitar la activación.</p>
    `,
  );

  const texto = [
    `Hola ${nombreAdmin},`,
    "",
    `La empresa ${nombreEmpresa} fue registrada en ${MARCA.nombre}. Tu cuenta está pendiente de activación, por lo que todavía no puedes iniciar sesión.`,
    "",
    "Te avisaremos por este medio cuando esté activa. Si pasa un tiempo y no tienes respuesta, responde a este correo para solicitar la activación.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// Correo 3: la empresa se registra. Llega al SuperAdmin.
export function plantillaNuevaEmpresaSuperAdmin(
  nombreEmpresa: string,
  nombreAdmin: string,
  apellidoAdmin: string,
  emailAdmin: string,
): PlantillaCorreo {
  const titulo = "Nueva empresa pendiente de activación";
  const nombreCompleto = `${nombreAdmin} ${apellidoAdmin}`;

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

// Correo 4: un admin crea un proveedor. Llega al proveedor.
// No lleva contraseña: el admin se la entrega por fuera del sistema.
export function plantillaBienvenidaProveedor(
  nombreProveedor: string,
  nombreEmpresa: string,
): PlantillaCorreo {
  const titulo = `Tu cuenta de proveedor en ${MARCA.nombre}`;

  const html = layoutBase(
    titulo,
    `Fuiste registrado como proveedor de ${nombreEmpresa}.`,
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreProveedor)}</strong>,</p>
      <p style="margin:0 0 12px 0;">Fuiste registrado como proveedor de la empresa <strong>${escapeHtml(nombreEmpresa)}</strong> en ${MARCA.nombre}.</p>
      <p style="margin:0;">Tu administrador te entregará tus datos de acceso.</p>
    `,
  );

  const texto = [
    `Hola ${nombreProveedor},`,
    "",
    `Fuiste registrado como proveedor de la empresa ${nombreEmpresa} en ${MARCA.nombre}.`,
    "",
    "Tu administrador te entregará tus datos de acceso.",
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}

// Correo 5: el SuperAdmin activa la empresa. Llega al admin.
export function plantillaEmpresaActivada(
  nombreAdmin: string,
  nombreEmpresa: string,
): PlantillaCorreo {
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

// Correo 6: el SuperAdmin desactiva la empresa. Llega al admin.
export function plantillaEmpresaDesactivada(
  nombreAdmin: string,
  nombreEmpresa: string,
): PlantillaCorreo {
  const titulo = "Tu empresa fue desactivada";

  const html = layoutBase(
    titulo,
    `${nombreEmpresa} fue desactivada.`,
    `
      <p style="margin:0 0 12px 0;">Hola <strong>${escapeHtml(nombreAdmin)}</strong>,</p>
      <p style="margin:0;">La empresa <strong>${escapeHtml(nombreEmpresa)}</strong> fue desactivada en ${MARCA.nombre} y ya no puedes iniciar sesión. Si crees que es un error, responde a este correo.</p>
    `,
  );

  const texto = [
    `Hola ${nombreAdmin},`,
    "",
    `La empresa ${nombreEmpresa} fue desactivada en ${MARCA.nombre} y ya no puedes iniciar sesión. Si crees que es un error, responde a este correo.`,
    "",
    `-- ${MARCA.nombre}`,
  ].join("\n");

  return { asunto: titulo, html, texto };
}
