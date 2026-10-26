import { SMTPClient } from "../Dependencies/Dependencias.ts";

interface DatosCorreo {
  para: string;
  asunto: string;
  html: string;
  texto?: string;
}


// quita la indentacion y las lineas vacias del html antes de enviarlo.
// evita que los espacios al final de linea salgan como "=20" en el cliente de correo
function limpiarHtml(html: string): string {
  return html
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .join("\n");
}

// envia un correo por smtp con la configuracion del .env.
// nunca lanza: devuelve true si salio y false si fallo, para que cada flujo decida que hacer
export async function enviarCorreo(datos: DatosCorreo): Promise<boolean> {
  try {
    const puerto = Number(Deno.env.get("SMTP_PORT") ?? 465);
    const usuario = Deno.env.get("SMTP_USER") ?? "";
    // la contraseña de aplicacion de google se muestra con espacios; se quitan por si se copio asi
    const clave = (Deno.env.get("SMTP_PASSWORD") ?? "").replace(/\s/g, "");
    const nombre = Deno.env.get("SMTP_FROM_NAME") ?? "GeoRuta";

    const smtp = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") ?? "",
        port: puerto,
        // 465 = tls directo; 587 = starttls (tls false). se deduce del puerto para no desajustarlos
        tls: puerto === 465,
        auth: { username: usuario, password: clave },
      },
    });

    try {
      await smtp.send({
        from: `${nombre} <${usuario}>`,
        to: datos.para,
        subject: datos.asunto,
        content: datos.texto ?? "Este mensaje requiere un cliente de correo compatible con HTML.",
        html: limpiarHtml(datos.html),
      });
    } finally {
      await smtp.close();
    }

    return true;
  } catch (error) {
    console.error("Error enviando correo:", error);
    return false;
  }
}