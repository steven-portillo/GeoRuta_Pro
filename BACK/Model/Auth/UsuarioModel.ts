import { conexion } from "../conexion.ts";
import { hash, compare } from "../../Dependencies/dependencias.ts";

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
}
