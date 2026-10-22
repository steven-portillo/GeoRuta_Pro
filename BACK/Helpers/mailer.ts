import { SMTPClient } from "../Dependencies/dependencias.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT"));
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

export interface AdjuntoCorreo {
  filename: string;
  content: string;
  contentType: string;
  encoding: "base64";
}

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    "⚠ Variables SMTP incompletas en el .env. El envío de correos va a fallar hasta que las configures.",
  );
}
// Quita la indentación y las líneas vacías del HTML antes de enviarlo.
// Evita que los espacios al final de línea salgan como "=20" en el cliente.
function limpiarHtml(html: string): string {
  return html
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .join("\n");
}

export async function enviarCorreo(
  destinatario: string,
  asunto: string,
  contenidoHtml: string,
  contenidoTexto?: string,
  attachments: AdjuntoCorreo[] = [],
): Promise<void> {
  const cliente = new SMTPClient({
    connection: {
      hostname: SMTP_HOST!,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USER!,
        password: SMTP_PASS!,
      },
    },
  });

  try {
    await cliente.send({
      from: `GeoRuta <${SMTP_FROM!}>`,
      to: destinatario,
      subject: asunto,
      content: contenidoTexto,
      html: limpiarHtml(contenidoHtml),
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  } catch (error) {
    // No se relanza: un fallo de correo nunca debe tumbar la operación
    // principal. Se registra en consola para diagnosticarlo.
    console.error("Error al enviar correo:", error);
  } finally {
    try {
      await cliente.close();
    } catch {
      // Si la conexión ni siquiera se abrió, no hay nada que cerrar.
    }
  }
}
