import { conexion } from "../conexion.ts";
import { eliminarArchivo } from "../../Helpers/archivos.ts";
import { hash, compare } from "../../Dependencies/dependencias.ts";

interface EditarPerfilData {
  nombre?: string;
  apellido?: string;
  email?: string;
  imagen_url?: string;
}

interface CambiarPasswordData {
  passwordActual: string;
  passwordNueva: string;
}

export class Perfil {
  static async Obtener(id_usuario: number) {
    const [usuario] = await conexion.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.imagen_url, r.nombre_rol AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [id_usuario],
    );
    return usuario ?? null;
  }

  static async Editar(
    id_usuario: number,
    datos: EditarPerfilData,
    id_rol?: number,
  ) {
    if (datos.email) {
      const [existente] = await conexion.query(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
        [datos.email, id_usuario],
      );
      if (existente) {
        return {
          success: false,
          message: "El correo electrónico ya está en uso",
        };
      }
    }

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

    let imagenAnterior: string | null = null;
    if (datos.imagen_url) {
      const [actual] = await conexion.query(
        `SELECT imagen_url FROM usuarios WHERE id_usuario = ?`,
        [id_usuario],
      );
      imagenAnterior = actual?.imagen_url ?? null;
      campos.push("imagen_url = ?");
      valores.push(datos.imagen_url);
    }

    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }

    let where = "id_usuario = ?";
    valores.push(id_usuario);
    if (id_rol !== undefined) {
      where += " AND id_rol = ?";
      valores.push(id_rol);
    }

    const result = await conexion.execute(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE ${where}`,
      valores,
    );

    if (id_rol !== undefined && result.affectedRows === 0) {
      return { success: false, message: "Usuario no encontrado" };
    }

    if (imagenAnterior) {
      await eliminarArchivo(imagenAnterior);
    }

    return { success: true, message: "Perfil actualizado correctamente" };
  }

  /** Quita la foto de perfil sin reemplazarla — queda NULL (el frontend muestra su placeholder por defecto) */
  static async EliminarFoto(id_usuario: number) {
    const [usuario] = await conexion.query(
      `SELECT imagen_url FROM usuarios WHERE id_usuario = ?`,
      [id_usuario],
    );
    if (!usuario?.imagen_url) {
      return { success: false, message: "No hay foto para eliminar" };
    }

    await conexion.execute(
      `UPDATE usuarios SET imagen_url = NULL WHERE id_usuario = ?`,
      [id_usuario],
    );
    await eliminarArchivo(usuario.imagen_url);

    return { success: true, message: "Foto de perfil eliminada" };
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
}
