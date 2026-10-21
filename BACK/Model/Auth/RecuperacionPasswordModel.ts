import { hash } from "../../Dependencies/dependencias.ts";
import { conexion } from "../conexion.ts";

interface SolicitudRecuperacion {
  email: string;
  nombre: string;
  token: string;
}

function tokenAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export class RecuperacionPassword {
  static async Solicitar(email: string): Promise<
    SolicitudRecuperacion | null
  > {
    await conexion.execute("START TRANSACTION");
    try {
      const [usuario] = await conexion.query(
        `SELECT id_usuario, nombre, email
         FROM usuarios
         WHERE email = ? AND activo = 1
         FOR UPDATE`,
        [email],
      );
      if (!usuario) {
        await conexion.execute("COMMIT");
        return null;
      }

      const [limite] = await conexion.query(
        `SELECT COUNT(*) AS solicitudes
         FROM recuperacion_password
         WHERE id_usuario = ?
           AND creado_en >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 MINUTE)`,
        [usuario.id_usuario],
      );
      if (Number(limite?.solicitudes ?? 0) >= 3) {
        await conexion.execute("COMMIT");
        return null;
      }

      await conexion.execute(
        `UPDATE recuperacion_password SET usado = 1
         WHERE id_usuario = ? AND usado = 0`,
        [usuario.id_usuario],
      );
      const token = tokenAleatorio();
      const tokenHash = await hashToken(token);
      await conexion.execute(
        `INSERT INTO recuperacion_password
           (id_usuario, codigo, expiracion, usado, creado_en)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), 0,
                 CURRENT_TIMESTAMP)`,
        [usuario.id_usuario, tokenHash],
      );
      await conexion.execute("COMMIT");
      return {
        email: usuario.email,
        nombre: usuario.nombre,
        token,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error creando solicitud de recuperación:", error);
      throw error;
    }
  }

  static async Restablecer(token: string, nuevaPassword: string) {
    const tokenHash = await hashToken(token);
    const [tokenExistente] = await conexion.query(
      `SELECT r.id FROM recuperacion_password r
       INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
       WHERE r.codigo = ? AND r.usado = 0
         AND r.expiracion > CURRENT_TIMESTAMP AND u.activo = 1`,
      [tokenHash],
    );
    if (!tokenExistente) {
      return {
        success: false as const,
        message: "El enlace es inválido o expiró",
      };
    }
    const passwordHash = await hash(nuevaPassword);

    await conexion.execute("START TRANSACTION");
    try {
      const [solicitud] = await conexion.query(
        `SELECT r.id, r.id_usuario
         FROM recuperacion_password r
         INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
         WHERE r.codigo = ? AND r.usado = 0
           AND r.expiracion > CURRENT_TIMESTAMP AND u.activo = 1
         FOR UPDATE`,
        [tokenHash],
      );
      if (!solicitud) {
        await conexion.execute("ROLLBACK");
        return {
          success: false as const,
          message: "El enlace es inválido o expiró",
        };
      }

      await conexion.execute(
        `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`,
        [passwordHash, solicitud.id_usuario],
      );
      await conexion.execute(
        `UPDATE recuperacion_password SET usado = 1
         WHERE id_usuario = ? AND usado = 0`,
        [solicitud.id_usuario],
      );
      await conexion.execute("COMMIT");
      return {
        success: true as const,
        message: "La contraseña fue restablecida correctamente",
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error restableciendo contraseña:", error);
      throw error;
    }
  }
}
