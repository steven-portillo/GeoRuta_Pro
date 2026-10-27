import { conexion } from "../conexion.ts";
import { hash, compare } from "../../Dependencies/dependencias.ts";

const ID_ROL_SUPERADMIN = 1;

interface LoginData {
  email: string;
  password: string;
}

interface RegistroUser {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

const ColorPrincipalDefault = "#1d4ed8";
const ColorSecundarioDefault = "#334155";

interface EmpresaData {
  nombreEmpresa: string;
  descripcionEmpresa?: string;
  logoEmpresa?: string;
}

interface AdminData {
  nombreAdmin: string;
  apellidoAdmin: string;
  emailAdmin: string;
  passwordAdmin: string;
}

interface RegistroEmpresaCompleto extends EmpresaData, AdminData {}

export class Usuario {
  public _ObjLogin: LoginData | null;
  public _ObjRegistro: RegistroUser | null;
  public _ObjRegistroEmpresa: RegistroEmpresaCompleto | null;

  constructor(
    ObjLogin: LoginData | null = null,
    ObjRegistro: RegistroUser | null = null,
    ObjRegistroEmpresa: RegistroEmpresaCompleto | null = null,
  ) {
    this._ObjLogin = ObjLogin;
    this._ObjRegistro = ObjRegistro;
    this._ObjRegistroEmpresa = ObjRegistroEmpresa;
  }

  /** Registro de clientes */
  public async Registrar(): Promise<
    | { success: true; message: string; id?: number }
    | { success: false; message: string }
  > {
    try {
      const u = this._ObjRegistro;
      if (!u) {
        return {
          success: false,
          message: "No se recibieron datos para registrar",
        };
      }

      // Validar campos obligatorios
      if (!u.nombre || !u.apellido || !u.email || !u.password) {
        return { success: false, message: "Faltan campos obligatorios" };
      }

      // Verificar email único
      const [existeEmail] = await conexion.query(
        `SELECT id_usuario FROM usuarios WHERE email = ?`,
        [u.email],
      );
      if (existeEmail) {
        return {
          success: false,
          message: "El correo electrónico ya está registrado",
        };
      }

      const passwordHasheado = await hash(u.password);

      const result = await conexion.execute(
        `INSERT INTO usuarios 
          (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
         VALUES (NULL, 4, ?, ?, ?, ?, NULL, 1, CURRENT_TIMESTAMP)`,
        [u.nombre, u.apellido, u.email, passwordHasheado],
      );

      return {
        success: true,
        message: "Usuario registrado correctamente",
        id: result.lastInsertId as number,
      };
    } catch (error) {
      console.error("Error Registrar:", error);
      return { success: false, message: "Error al registrar el usuario" };
    }
  }

  /** Login */
  public async IniciarSesion(): Promise<
    | {
        success: true;
        message: string;
        data: {
          idUsuario: number;
          nombre: string;
          apellido: string;
          email: string;
          rol: string;
          idRol: number;
          idEmpresa: number | null;
        };
      }
    | { success: false; message: string }
  > {
    try {
      const email = this._ObjLogin?.email;
      const password = this._ObjLogin?.password;

      if (!email || !password) {
        return {
          success: false,
          message: "Email y contraseña son obligatorios",
        };
      }

      const [usuario] = await conexion.query(
        `SELECT u.*, r.nombre_rol AS rol
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.email = ?`,
        [email],
      );

      if (!usuario) {
        return { success: false, message: "Credenciales incorrectas" };
      }

      const passwordValido = await compare(password, usuario.password_hash);
      if (!passwordValido) {
        return { success: false, message: "Credenciales incorrectas" };
      }

      if (!usuario.activo) {
        return {
          success: false,
          message:
            "Tu cuenta está inactiva. Contacta al SuperAdmin para más información",
        };
      }

      return {
        success: true,
        message: "Sesión iniciada correctamente",
        data: {
          idUsuario: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rol: usuario.rol,
          idRol: usuario.id_rol,
          idEmpresa: usuario.id_empresa,
        },
      };
    } catch (error) {
      console.error("Error Login:", error);
      return { success: false, message: "Error del servidor" };
    }
  }

  public static async SolicitarCodigoRecuperacion(
    email: string,
    codigo: string,
  ): Promise<boolean> {
    const [usuario] = await conexion.query(
      `SELECT id_usuario FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1`,
      [email],
    );
    if (!usuario) return false;

    const [codigoReciente] = await conexion.query(
      `SELECT id FROM recuperacion_password
       WHERE id_usuario = ?
         AND usado = 0
         AND expiracion > DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 9 MINUTE)
       LIMIT 1`,
      [usuario.id_usuario],
    );
    if (codigoReciente) return false;

    await conexion.execute(
      `DELETE FROM recuperacion_password WHERE id_usuario = ? AND usado = 0`,
      [usuario.id_usuario],
    );
    await conexion.execute(
      `INSERT INTO recuperacion_password (id_usuario, codigo, expiracion, usado)
       VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE), 0)`,
      [usuario.id_usuario, codigo],
    );
    return true;
  }

  public static async InvalidarCodigoRecuperacion(
    email: string,
    codigo: string,
  ): Promise<void> {
    await conexion.execute(
      `DELETE rp FROM recuperacion_password rp
       INNER JOIN usuarios u ON u.id_usuario = rp.id_cliente
       WHERE u.email = ? AND rp.codigo = ? AND rp.usado = 0`,
      [email, codigo],
    );
  }

  public static async VerificarCodigoRecuperacion(
    email: string,
    codigo: string,
  ): Promise<boolean> {
    await conexion.execute("START TRANSACTION");
    try {
      const [registro] = await conexion.query(
        `SELECT rp.id, rp.codigo, rp.expiracion > CURRENT_TIMESTAMP AS vigente
         FROM recuperacion_password rp
         INNER JOIN usuarios u ON u.id_usuario = rp.id_cliente
         WHERE u.email = ? AND u.activo = 1 AND rp.usado = 0
         ORDER BY rp.id DESC LIMIT 1 FOR UPDATE`,
        [email],
      );

      if (!registro || !Number(registro.vigente)) {
        await conexion.execute("COMMIT");
        return false;
      }

      await conexion.execute("COMMIT");
      return registro.codigo === codigo;
    } catch (error) {
      await conexion.execute("ROLLBACK");
      throw error;
    }
  }

  public static async RestablecerContrasena(
    email: string,
    codigo: string,
    nuevaContrasena: string,
  ): Promise<boolean> {
    const passwordHash = await hash(nuevaContrasena);
    await conexion.execute("START TRANSACTION");
    try {
      const [registro] = await conexion.query(
        `SELECT rp.id, u.id_usuario, rp.codigo,
                rp.expiracion > CURRENT_TIMESTAMP AS vigente
         FROM recuperacion_password rp
         INNER JOIN usuarios u ON u.id_usuario = rp.id_cliente
         WHERE u.email = ? AND u.activo = 1 AND rp.usado = 0
         ORDER BY rp.id DESC LIMIT 1 FOR UPDATE`,
        [email],
      );

      if (
        !registro ||
        registro.codigo !== codigo ||
        !Number(registro.vigente)
      ) {
        await conexion.execute("COMMIT");
        return false;
      }

      const resultado = await conexion.execute(
        `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ? AND activo = 1`,
        [passwordHash, registro.id_usuario],
      );
      if (Number(resultado.affectedRows) !== 1) {
        await conexion.execute("ROLLBACK");
        return false;
      }

      await conexion.execute(
        `UPDATE recuperacion_password SET usado = 1 WHERE id = ? AND usado = 0`,
        [registro.id],
      );
      await conexion.execute("COMMIT");
      return true;
    } catch (error) {
      await conexion.execute("ROLLBACK");
      throw error;
    }
  }

  public async RegistrarEmpresa(): Promise<
    { success: true; message: string } | { success: false; message: string }
  > {
    try {
      const empresa = this._ObjRegistroEmpresa;

      if (!empresa) {
        return {
          success: false,
          message: "No se recibieron datos para registrar",
        };
      }

      if (
        !empresa.nombreEmpresa ||
        !empresa.nombreAdmin ||
        !empresa.apellidoAdmin ||
        !empresa.emailAdmin ||
        !empresa.passwordAdmin
      ) {
        return { success: false, message: "Faltan campos obligatorios" };
      }

      // Verificar email único
      const [existeEmail] = await conexion.query(
        `SELECT id_usuario FROM usuarios WHERE email = ?`,
        [empresa.emailAdmin],
      );
      if (existeEmail) {
        return {
          success: false,
          message: "El correo electrónico ya está registrado",
        };
      }

      const [nombreEmpresa] = await conexion.query(
        `SELECT id_empresa FROM empresas WHERE nombre = ?`,
        [empresa.nombreEmpresa],
      );
      if (nombreEmpresa) {
        return {
          success: false,
          message: "El nombre de la empresa ya está registrado",
        };
      }

      const passwordHasheado = await hash(empresa.passwordAdmin);

      try {
        await conexion.execute("START TRANSACTION");

        const empresaResult = await conexion.execute(
          `INSERT INTO empresas 
          (nombre,
          logo_url,
          descripcion,
          estado,
          fecha_creacion,
          color_primario,
          color_acento)
           VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, ?, ?)`,
          [
            empresa.nombreEmpresa,
            empresa.logoEmpresa ?? null,
            empresa.descripcionEmpresa ?? null,
            ColorPrincipalDefault,
            ColorSecundarioDefault,
          ],
        );

        const idEmpresa = empresaResult.lastInsertId as number;

        await conexion.execute(
          `INSERT INTO usuarios 
          (id_empresa,
          id_rol,
          nombre,
          apellido,
          email,
          password_hash,
          imagen_url,
          activo,
          fecha_creacion)
          VALUES (?,?,?,?,?,?,null, 0, CURRENT_TIMESTAMP)`,
          [
            idEmpresa,
            2,
            empresa.nombreAdmin,
            empresa.apellidoAdmin,
            empresa.emailAdmin,
            passwordHasheado,
          ],
        );
        await conexion.execute("COMMIT");
        return {
          success: true,
          message: "Empresa y usuario creados correctamente",
        };
      } catch (error) {
        await conexion.execute("ROLLBACK");
        console.error("Error al crear empresa y administrador:", error);
        return {
          success: false,
          message: "Error al crear la empresa y administrador",
        };
      }
    } catch (error) {
      console.error("Error al Registrar:", error);
      return { success: false, message: "Error al registrar empresa" };
    }
  }

  /** Email del SuperAdmin, para avisarle de nuevas empresas */
  public static async ObtenerEmailSuperAdmin(): Promise<string | null> {
    const [superAdmin] = await conexion.query(
      `SELECT email FROM usuarios WHERE id_rol = ? AND activo = 1 LIMIT 1`,
      [ID_ROL_SUPERADMIN],
    );
    return superAdmin?.email ?? null;
  }
}
