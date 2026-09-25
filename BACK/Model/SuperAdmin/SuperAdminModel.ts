import { conexion } from "../conexion.ts";
import { hash, compare } from "../../Dependencies/dependencias.ts";

const ID_ROL_ADMIN = 2;
const ID_ROL_CLIENTE = 4;

interface EditarUsuarioData {
  nombre?: string;
  apellido?: string;
  email?: string;
  imagen_url?: string;
}

interface CambiarPasswordData {
  passwordActual: string;
  passwordNueva: string;
}

export class SuperAdmin {
  /** EMPRESAS */
  static async ListarEmpresas() {
    return await conexion.query(
      `SELECT
        e.id_empresa, e.nombre, e.logo_url, e.descripcion, e.estado, e.fecha_creacion,
        u.id_usuario AS id_admin, u.nombre AS nombre_admin, u.apellido AS apellido_admin, u.email AS email_admin
      FROM empresas e
      INNER JOIN usuarios u ON u.id_empresa = e.id_empresa AND u.id_rol = ${ID_ROL_ADMIN}
      ORDER BY e.fecha_creacion DESC`,
    );
  }

  static async CambiarEstadoEmpresa(id_empresa: number, nuevoEstado: 0 | 1) {
    try {
      await conexion.execute("START TRANSACTION");

      await conexion.execute(
        `UPDATE empresas SET estado = ? WHERE id_empresa = ?`,
        [nuevoEstado, id_empresa],
      );

      await conexion.execute(
        `UPDATE usuarios SET activo = ? WHERE id_empresa = ? AND id_rol = ?`,
        [nuevoEstado, id_empresa, ID_ROL_ADMIN],
      );

      await conexion.execute("COMMIT");
      return { success: true, message: "Estado actualizado correctamente" };
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("Error CambiarEstadoEmpresa:", error);
      return { success: false, message: "Error al cambiar el estado" };
    }
  }

  /** CLIENTES */
  static async ListarClientes() {
    return await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo, fecha_creacion
       FROM usuarios
       WHERE id_rol = ?
       ORDER BY fecha_creacion DESC`,
      [ID_ROL_CLIENTE],
    );
  }

  static async CambiarEstadoCliente(id_usuario: number, nuevoEstado: 0 | 1) {
    const result = await conexion.execute(
      `UPDATE usuarios SET activo = ? WHERE id_usuario = ? AND id_rol = ?`,
      [nuevoEstado, id_usuario, ID_ROL_CLIENTE],
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Cliente no encontrado" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }

  static async EditarCliente(id_usuario: number, datos: EditarUsuarioData) {
    return await SuperAdmin.editarUsuarioGenerico(
      id_usuario,
      ID_ROL_CLIENTE,
      datos,
    );
  }

  static async ObtenerClientePorId(id_usuario: number) {
    const [cliente] = await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo, fecha_creacion
     FROM usuarios WHERE id_usuario = ? AND id_rol = ?`,
      [id_usuario, ID_ROL_CLIENTE],
    );
    return cliente ?? null;
  }

  /** PERFIL PROPIO */
  static async ObtenerPerfil(id_usuario: number) {
    const [usuario] = await conexion.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.imagen_url, r.nombre_rol AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [id_usuario],
    );
    return usuario ?? null;
  }

  static async EditarPerfil(id_usuario: number, datos: EditarUsuarioData) {
    return await SuperAdmin.editarUsuarioGenerico(id_usuario, null, datos);
  }

  static async CambiarPassword(id_usuario: number, datos: CambiarPasswordData) {
    const [usuario] = await conexion.query(
      `SELECT password_hash FROM usuarios WHERE id_usuario = ?`,
      [id_usuario],
    );

    if (!usuario) {
      return { success: false, message: "Usuario no encontrado" };
    }

    const passwordValido = await compare(
      datos.passwordActual,
      usuario.password_hash,
    );
    if (!passwordValido) {
      return { success: false, message: "La contraseña actual es incorrecta" };
    }

    const nuevoHash = await hash(datos.passwordNueva);
    await conexion.execute(
      `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`,
      [nuevoHash, id_usuario],
    );

    return { success: true, message: "Contraseña actualizada correctamente" };
  }

  /** Reutilizado por EditarCliente y EditarPerfil */
  private static async editarUsuarioGenerico(
    id_usuario: number,
    id_rol: number | null,
    datos: EditarUsuarioData,
  ) {
    const campos: string[] = [];
    const valores: unknown[] = [];

    if (datos.nombre) {
      campos.push("nombre = ?");
      valores.push(datos.nombre);
    }
    if (datos.apellido) {
      campos.push("apellido = ?");
      valores.push(datos.apellido);
    }
    if (datos.email) {
      campos.push("email = ?");
      valores.push(datos.email);
    }
    if (datos.imagen_url) {
      campos.push("imagen_url = ?");
      valores.push(datos.imagen_url);
    }

    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }

    let where = "id_usuario = ?";
    valores.push(id_usuario);
    if (id_rol !== null) {
      where += " AND id_rol = ?";
      valores.push(id_rol);
    }

    const result = await conexion.execute(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE ${where}`,
      valores,
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Usuario no encontrado" };
    }
    return { success: true, message: "Datos actualizados correctamente" };
  }
}
