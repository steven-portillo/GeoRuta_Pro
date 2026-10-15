import { conexion } from "../conexion.ts";

interface GoogleUserData {
  nombre: string;
  apellido: string;
  email: string;
  imagen_url: string | null;
}

export class UsuarioGoogle {
  /** Busca usuario por email */
  public async BuscarPorEmail(email: string): Promise<{
    id_usuario: number;
    id_empresa: number | null;
    id_rol: number;
    nombre: string;
    apellido: string;
    email: string;
    imagen_url: string | null;
    activo: number | boolean;
    rol: string;
  } | null> {
    const [usuario] = await conexion.query(
      `SELECT u.id_usuario, u.id_empresa, u.id_rol, u.nombre, u.apellido,
              u.email, u.imagen_url, u.activo, r.nombre_rol AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.id_rol = r.id_rol
       WHERE lower(trim(u.email)) = lower(trim(?))`,
      [email],
    );
    return usuario ?? null;
  }

  /**
   * Alta desde Google
   * id_rol = 4 (CLIENTE), password_hash = '(GOOGLE_HASH)'
   */
  public async RegistrarDesdeGoogle(
    data: GoogleUserData,
  ): Promise<
    | { success: true; message: string; id: number }
    | { success: false; message: string }
  > {
    try {
      if (!data.nombre || !data.email) {
        return { success: false, message: "Faltan datos de Google" };
      }

      const existe = await this.existeEmail(data.email);
      if (existe) {
        return {
          success: false,
          message: "El correo electrónico ya está registrado",
        };
      }

      const result = await conexion.execute(
        `INSERT INTO usuarios
          (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
         VALUES (NULL, 4, ?, ?, ?, '(GOOGLE_HASH)', ?, 1, CURRENT_TIMESTAMP)`,
        [
          data.nombre,
          data.apellido || "",
          data.email,
          data.imagen_url,
        ],
      );

      return {
        success: true,
        message: "Usuario Google registrado correctamente",
        id: result.lastInsertId as number,
      };
    } catch (error) {
      console.error("Error RegistrarDesdeGoogle:", error);
      return { success: false, message: "Error al registrar usuario Google" };
    }
  }

  /**
   * Login o registro automático con Google.
   * Si no existe → crea CLIENTE.
   * Si existe → valida activo y devuelve datos.
   */
  public async IniciarSesionGoogle(data: GoogleUserData): Promise<
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
          imagen_url: string | null;
        };
      }
    | { success: false; message: string }
  > {
    try {
      if (!data.email) {
        return { success: false, message: "Email de Google requerido" };
      }

      let usuario = await this.BuscarPorEmail(data.email);

      if (!usuario) {
        const creado = await this.RegistrarDesdeGoogle(data);
        if (!creado.success) {
          return { success: false, message: creado.message };
        }
        usuario = await this.BuscarPorEmail(data.email);
        if (!usuario) {
          return {
            success: false,
            message: "No se pudo crear el usuario de Google",
          };
        }
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
        message: "Sesión Google iniciada correctamente",
        data: {
          idUsuario: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rol: String(usuario.rol).toUpperCase(),
          idRol: usuario.id_rol,
          idEmpresa: usuario.id_empresa,
          imagen_url: usuario.imagen_url ?? data.imagen_url,
        },
      };
    } catch (error) {
      console.error("Error IniciarSesionGoogle:", error);
      return { success: false, message: "Error del servidor" };
    }
  }

  private async existeEmail(email: string): Promise<boolean> {
    const [row] = await conexion.query(
      `SELECT COUNT(1) AS total FROM usuarios
       WHERE lower(trim(email)) = lower(trim(?))`,
      [email],
    );
    return Number(row?.total ?? 0) > 0;
  }
}