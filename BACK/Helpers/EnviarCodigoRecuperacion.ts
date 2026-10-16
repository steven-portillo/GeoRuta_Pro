import { enviarCorreo } from "./EnviarCorreo.ts";

// el nombre viene de la base (lo escribio el usuario al registrarse), asi que se escapa
// antes de meterlo en el html del correo
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// arma y envia el correo con el codigo de recuperacion; devuelve true si salio
export async function enviarCodigoRecuperacion(
  email: string,
  nombre: string,
  codigo: string,
  minutosVigencia: number,
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#3b82f6;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">GeoRuta</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Recuperación de contraseña</p>
        </div>
        <div style="padding:28px 32px 0;">
          <p style="margin:0 0 8px;color:#1e293b;font-size:15px;">Hola, <strong>${escaparHtml(nombre)}</strong></p>
          <p style="margin:0;color:#64748b;font-size:14px;">Usa este código para crear una nueva contraseña:</p>
        </div>
        <div style="margin:24px 32px;background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0;text-align:center;">
          <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#1e293b;">${codigo}</span>
        </div>
        <div style="padding:0 32px 28px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;">El código vence en ${minutosVigencia} minutos y solo se puede usar una vez.</p>
          <p style="margin:0;color:#64748b;font-size:13px;">Si no pediste este cambio, ignora este mensaje: tu contraseña actual sigue funcionando.</p>
        </div>
        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">Correo automático de GeoRuta. No respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>`;

  return await enviarCorreo({
    para: email,
    asunto: "Tu código de recuperación — GeoRuta",
    texto: `Tu código de recuperación de GeoRuta es ${codigo}. Vence en ${minutosVigencia} minutos.`,
    html,
  });
}