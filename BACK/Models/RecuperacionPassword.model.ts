import { conexion } from "./Conexion.ts";
import { bcrypt } from "../Dependencies/Dependencias.ts";

interface SolicitudData {
  email: string;
}

interface RestablecerData {
  email: string;
  codigo: string;
  password: string;
}

// minutos de vigencia del codigo y cantidad maxima de intentos fallidos
export const MINUTOS_VIGENCIA = 15;
const MAX_INTENTOS = 5;
// segundos minimos entre un codigo y el siguiente para el mismo usuario (evita spam de correos)
const SEGUNDOS_ENTRE_CODIGOS = 60;

// mensaje unico para cualquier fallo de verificacion: no dice si fue el correo, el codigo o el tiempo
const MENSAJE_CODIGO_INVALIDO = "El código no es válido o ya expiró";

export class RecuperacionPassword {
  public _ObjSolicitud: SolicitudData | null;
  public _ObjRestablecer: RestablecerData | null;

  constructor(
    ObjSolicitud: SolicitudData | null = null,
    ObjRestablecer: RestablecerData | null = null,
  ) {
    this._ObjSolicitud = ObjSolicitud;
    this._ObjRestablecer = ObjRestablecer;
  }

  // crea un codigo de 6 digitos para el usuario y lo guarda hasheado.
  // devuelve el codigo en claro SOLO para que el controller lo envie por correo
  public async GenerarCodigo(): Promise<
    | { success: true; message: string; data: { codigo: string; nombre: string; email: string } }
    | { success: false; message: string; data?: undefined }
  > {
    try {
      const email = this._ObjSolicitud?.email;

      const { rows: usuarios } = await conexion.execute(
        `SELECT id_usuario, nombre, email FROM usuarios WHERE email = ? AND activo = 1`,
        [email],
      );

      if (!usuarios || usuarios.length === 0) {
        return { success: false, message: "No existe un usuario activo con ese correo" };
      }

      const usuario = usuarios[0] as { id_usuario: number; nombre: string; email: string };

      // si ya se pidio un codigo hace muy poco, no se genera otro
      const { rows: recientes } = await conexion.execute(
        `SELECT id_recuperacion FROM recuperacion_password
         WHERE id_usuario = ? AND fecha_creacion > DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [usuario.id_usuario, SEGUNDOS_ENTRE_CODIGOS],
      );

      if (recientes && recientes.length > 0) {
        return { success: false, message: "Ya se envió un código hace un momento" };
      }

      // codigo aleatorio criptografico de 6 digitos, con ceros a la izquierda si hacen falta
      const numero = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
      const codigo = String(numero).padStart(6, "0");
      const codigoHash = await bcrypt.hash(codigo);

      await conexion.transaction(async (conn) => {
        // los codigos anteriores sin usar quedan invalidados: solo el ultimo sirve
        await conn.execute(
          `UPDATE recuperacion_password SET usado = 1 WHERE id_usuario = ? AND usado = 0`,
          [usuario.id_usuario],
        );

        // la expiracion se calcula con el reloj de la base para no depender de la zona horaria
        await conn.execute(
          `INSERT INTO recuperacion_password (id_usuario, codigo_hash, expiracion)
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
          [usuario.id_usuario, codigoHash, MINUTOS_VIGENCIA],
        );
      });

      return {
        success: true,
        message: "Código generado",
        data: { codigo, nombre: usuario.nombre, email: usuario.email },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible generar el código" };
    }
  }

  // verifica el codigo y, si es correcto, cambia la contraseña
  public async Restablecer(): Promise<{ success: boolean; message: string }> {
    try {
      const datos = this._ObjRestablecer;
      if (!datos) return { success: false, message: "No se recibieron datos" };

      const { rows: usuarios } = await conexion.execute(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND activo = 1`,
        [datos.email],
      );

      if (!usuarios || usuarios.length === 0) {
        return { success: false, message: MENSAJE_CODIGO_INVALIDO };
      }

      const idUsuario = (usuarios[0] as { id_usuario: number }).id_usuario;

      // ultimo codigo vigente: sin usar, sin vencer y con intentos disponibles
      const { rows: codigos } = await conexion.execute(
        `SELECT id_recuperacion, codigo_hash FROM recuperacion_password
         WHERE id_usuario = ? AND usado = 0 AND intentos < ? AND expiracion > NOW()
         ORDER BY id_recuperacion DESC LIMIT 1`,
        [idUsuario, MAX_INTENTOS],
      );

      if (!codigos || codigos.length === 0) {
        return { success: false, message: MENSAJE_CODIGO_INVALIDO };
      }

      const registro = codigos[0] as { id_recuperacion: number; codigo_hash: string };

      // se gasta un intento ANTES de comparar. al ser un solo UPDATE condicionado, aunque
      // lleguen muchas peticiones en paralelo solo caben MAX_INTENTOS comparaciones en total
      const reserva = await conexion.execute(
        `UPDATE recuperacion_password SET intentos = intentos + 1
         WHERE id_recuperacion = ? AND usado = 0 AND intentos < ?`,
        [registro.id_recuperacion, MAX_INTENTOS],
      );

      if (reserva.affectedRows !== 1) {
        return { success: false, message: MENSAJE_CODIGO_INVALIDO };
      }

      const codigoValido = await bcrypt.compare(datos.codigo, registro.codigo_hash);

      if (!codigoValido) {
        return { success: false, message: MENSAJE_CODIGO_INVALIDO };
      }

      const nuevoHash = await bcrypt.hash(datos.password);

      try {
        await conexion.transaction(async (conn) => {
          // el codigo se marca usado primero; si otra peticion ya lo uso, affectedRows sera 0
          const uso = await conn.execute(
            `UPDATE recuperacion_password SET usado = 1 WHERE id_recuperacion = ? AND usado = 0`,
            [registro.id_recuperacion],
          );
          if (uso.affectedRows !== 1) throw new Error("codigo_ya_usado");

          await conn.execute(
            `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`,
            [nuevoHash, idUsuario],
          );

          // cualquier otro codigo pendiente del usuario tambien queda invalidado
          await conn.execute(
            `UPDATE recuperacion_password SET usado = 1 WHERE id_usuario = ? AND usado = 0`,
            [idUsuario],
          );
        });
      } catch (error) {
        if (error instanceof Error && error.message === "codigo_ya_usado") {
          return { success: false, message: MENSAJE_CODIGO_INVALIDO };
        }
        throw error;
      }

      return { success: true, message: "Contraseña actualizada correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible restablecer la contraseña" };
    }
  }
}