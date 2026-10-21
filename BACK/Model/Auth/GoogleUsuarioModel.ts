import { conexion } from "../conexion.ts";

export interface GooglePerfil {
  sub: string;
  email: string;
  nombre: string;
  apellido: string;
  imagen_url?: string;
}

export class GoogleUsuario {
  static async IniciarOCrearCliente(perfil: GooglePerfil) {
    await conexion.execute("START TRANSACTION");
    try {
      const [porGoogle] = await conexion.query(
        `SELECT u.id_usuario, u.id_rol, u.id_empresa, u.nombre, u.apellido,
                u.email, u.activo, r.nombre_rol AS rol
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.google_sub = ? FOR UPDATE`,
        [perfil.sub],
      );
      let usuario = porGoogle;
      let creado = false;

      if (!usuario) {
        const [porEmail] = await conexion.query(
          `SELECT u.id_usuario, u.id_rol, u.id_empresa, u.nombre, u.apellido,
                  u.email, u.activo, u.google_sub, r.nombre_rol AS rol
           FROM usuarios u
           INNER JOIN roles r ON r.id_rol = u.id_rol
           WHERE u.email = ? FOR UPDATE`,
          [perfil.email],
        );
        if (porEmail && Number(porEmail.id_rol) !== 4) {
          await conexion.execute("ROLLBACK");
          return {
            success: false as const,
            message:
              "La cuenta existe, pero el acceso con Google está habilitado solo para clientes",
          };
        }
        if (
          porEmail && porEmail.google_sub && porEmail.google_sub !== perfil.sub
        ) {
          await conexion.execute("ROLLBACK");
          return {
            success: false as const,
            message: "Esta cuenta ya está vinculada con otra cuenta de Google",
          };
        }

        if (porEmail) {
          await conexion.execute(
            `UPDATE usuarios SET google_sub = ? WHERE id_usuario = ?`,
            [perfil.sub, porEmail.id_usuario],
          );
          usuario = { ...porEmail, google_sub: perfil.sub };
        } else {
          const result = await conexion.execute(
            `INSERT INTO usuarios
               (id_empresa, id_rol, nombre, apellido, email, password_hash,
                google_sub, imagen_url, activo, fecha_creacion)
             VALUES (NULL, 4, ?, ?, ?, NULL, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [
              perfil.nombre,
              perfil.apellido,
              perfil.email,
              perfil.sub,
              perfil.imagen_url ?? null,
            ],
          );
          usuario = {
            id_usuario: result.lastInsertId,
            id_rol: 4,
            id_empresa: null,
            nombre: perfil.nombre,
            apellido: perfil.apellido,
            email: perfil.email,
            activo: 1,
            google_sub: perfil.sub,
            rol: "CLIENTE",
          };
          creado = true;
        }
      } else if (Number(usuario.id_rol) !== 4) {
        await conexion.execute("ROLLBACK");
        return {
          success: false as const,
          message:
            "El acceso con Google está habilitado solo para cuentas de cliente",
        };
      }

      if (!usuario.activo) {
        await conexion.execute("ROLLBACK");
        return {
          success: false as const,
          message:
            "Tu cuenta está inactiva. Contacta al SuperAdmin para más información",
        };
      }

      if (porGoogle && perfil.imagen_url) {
        await conexion.execute(
          `UPDATE usuarios SET imagen_url = COALESCE(imagen_url, ?)
           WHERE id_usuario = ?`,
          [perfil.imagen_url, usuario.id_usuario],
        );
      }
      await conexion.execute("COMMIT");
      return {
        success: true as const,
        data: {
          idUsuario: Number(usuario.id_usuario),
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          rol: usuario.rol,
          idRol: Number(usuario.id_rol),
          idEmpresa: usuario.id_empresa === null
            ? null
            : Number(usuario.id_empresa),
        },
        creado,
      };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error autenticando cliente con Google:", error);
      throw error;
    }
  }
}
