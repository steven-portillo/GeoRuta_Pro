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
      const insert = await conexion.execute(
        `INSERT INTO recuperacion_password
           (id_usuario, codigo, expiracion, usado, creado_en, intentos, bloqueado)
         VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), 0,
                 CURRENT_TIMESTAMP, 0, 0)`,
        [usuario.id_usuario, tokenHash],
      );
      await conexion.execute("COMMIT");
      return {
        email: usuario.email,
        nombre: usuario.nombre,
        token: `${insert.lastInsertId}.${token}`,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error creando solicitud de recuperación:", error);
      throw error;
    }
  }

  static async Restablecer(token: string, nuevaPassword: string) {
    const [idParte, secreto] = token.split(".");
    const idSolicitud = Number(idParte);
    if (
      !Number.isSafeInteger(idSolicitud) || idSolicitud <= 0 ||
      !/^[\da-f]{64}$/i.test(secreto ?? "")
    ) {
      return {
        success: false as const,
        message: "El enlace es inválido o expiró",
      };
    }
    const tokenHash = await hashToken(secreto.toLowerCase());

    await conexion.execute("START TRANSACTION");
    try {
      const [solicitud] = await conexion.query(
        `SELECT r.id, r.id_usuario, r.codigo, r.expiracion, r.usado,
                r.intentos, r.bloqueado, u.activo,
                (r.expiracion <= CURRENT_TIMESTAMP) AS expirada
         FROM recuperacion_password r
         INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
         WHERE r.id = ?
         FOR UPDATE`,
        [idSolicitud],
      );
      if (!solicitud) {
        await conexion.execute("ROLLBACK");
        return {
          success: false as const,
          message: "El enlace es inválido o expiró",
        };
      }
      if (
        Number(solicitud.usado) === 1 ||
        Number(solicitud.bloqueado) === 1 ||
        Number(solicitud.activo) !== 1 ||
        Number(solicitud.expirada) === 1
      ) {
        await conexion.execute("ROLLBACK");
        return {
          success: false as const,
          message: Number(solicitud.bloqueado) === 1
            ? "Se agotaron los intentos. Solicita un nuevo enlace para restablecer la contraseña."
            : "El enlace es inválido o expiró",
        };
      }
      if (solicitud.codigo !== tokenHash) {
        const intentos = Number(solicitud.intentos) + 1;
        const bloqueado = intentos >= 5;
        await conexion.execute(
          `UPDATE recuperacion_password
           SET intentos = ?, bloqueado = ?
           WHERE id = ? AND usado = 0`,
          [intentos, bloqueado ? 1 : 0, idSolicitud],
        );
        await conexion.execute("COMMIT");
        return {
          success: false as const,
          message: bloqueado
            ? "Se agotaron los intentos. Solicita un nuevo enlace para restablecer la contraseña."
            : `El enlace no es válido. Te quedan ${5 - intentos} intento(s).`,
          intentos_restantes: Math.max(0, 5 - intentos),
        };
      }

      const passwordHash = await hash(nuevaPassword);
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
