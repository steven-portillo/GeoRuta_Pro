import { conexion } from "./conexion.ts";
import { hash, compare } from "../Dependencies/dependencias.ts";

interface LoginData {
  email: string;
  password: string;
}

interface RegistroData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export class Usuario {
  public _ObjLogin: LoginData | null;
  public _ObjRegistro: RegistroData | null;

  constructor(
    ObjLogin: LoginData | null = null,
    ObjRegistro: RegistroData | null = null,
  ) {
    this._ObjLogin = ObjLogin;
    this._ObjRegistro = ObjRegistro;
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
         WHERE u.email = ? AND u.activo = 1`,
        [email],
      );

      if (!usuario) {
        return { success: false, message: "Credenciales incorrectas" };
      }

      const passwordValido = await compare(password, usuario.password_hash);
      if (!passwordValido) {
        return { success: false, message: "Credenciales incorrectas" };
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
        },
      };
    } catch (error) {
      console.error("Error Login:", error);
      return { success: false, message: "Error del servidor" };
    }
  }

  /** Obtener usuario por ID */
  public static async ObtenerPorId(id: number) {
    const [usuario] = await conexion.query(
      `SELECT u.id_usuario, u.id_empresa, u.id_rol, u.nombre, u.apellido,
            u.email, u.imagen_url, u.activo, u.fecha_creacion,
            r.nombre_rol AS rol
       FROM usuarios u
           INNER JOIN roles r ON u.id_rol = r.id_rol
           WHERE u.id_usuario = ?`,
      [id],
    );
    return usuario ?? null;
  }

  /** Listar todos los usuarios (Admin) */
  public static async ListarTodos(rolFiltro?: number) {
    let sql = `
          SELECT u.id_usuario, u.id_empresa, u.id_rol, u.nombre, u.apellido,
            u.email, u.imagen_url, u.activo, u.fecha_creacion,
            r.nombre_rol AS rol
      FROM usuarios u
          INNER JOIN roles r ON u.id_rol = r.id_rol
    `;
    const params: unknown[] = [];

    if (rolFiltro) {
      sql += ` WHERE u.id_rol = ?`;
      params.push(rolFiltro);
    }

    sql += ` ORDER BY u.nombre`;
    return await conexion.query(sql, params);
  }

  /** Actualizar usuario */
  public static async Actualizar(
    id: number,
    datos: {
      nombre?: string;
      apellido?: string;
      email?: string;
      password?: string;
      imagen_url?: string | null;
      activo?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (datos.nombre) {
        sets.push("nombre = ?");
        params.push(datos.nombre);
      }
      if (datos.apellido) {
        sets.push("apellido = ?");
        params.push(datos.apellido);
      }
      if (datos.email) {
        const [existe] = await conexion.query(
          `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
          [datos.email, id],
        );
        if (existe) {
          return {
            success: false,
            message: "El email ya está en uso por otro usuario",
          };
        }
        sets.push("email = ?");
        params.push(datos.email);
      }
      if (datos.password) {
        const passwordHasheado = await hash(datos.password);
        sets.push("password_hash = ?");
        params.push(passwordHasheado);
      }
      if (datos.imagen_url !== undefined) {
        sets.push("imagen_url = ?");
        params.push(datos.imagen_url);
      }
      if (datos.activo !== undefined) {
        sets.push("activo = ?");
        params.push(datos.activo);
      }

      if (sets.length === 0) {
        return {
          success: false,
          message: "No se recibió ningún dato para actualizar",
        };
      }

      params.push(id);
      await conexion.execute(
        `UPDATE usuarios SET ${sets.join(", ")} WHERE id_usuario = ?`,
        params,
      );

      return { success: true, message: "Usuario actualizado correctamente" };
    } catch (error) {
      console.error("Error Actualizar Usuario:", error);
      return { success: false, message: "Error al actualizar el usuario" };
    }
  }

  /** Desactivar proveedor (soft delete) */
  public static async Desactivar(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await conexion.execute(
        `UPDATE usuarios SET activo = 0 WHERE id_usuario = ? AND id_rol = 3`,
        [id],
      );
      return { success: true, message: "Técnico desactivado correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Error al desactivar el técnico" };
    }
  }
}