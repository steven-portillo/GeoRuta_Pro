import { conexion } from "../conexion.ts";

const ID_ROL_CLIENTE = 4;

interface EditarClienteData {
  nombre?: string;
  apellido?: string;
  email?: string;
  imagen_url?: string;
}

export class Cliente {
  static async Listar() {
    return await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo, fecha_creacion
       FROM usuarios WHERE id_rol = ? ORDER BY fecha_creacion DESC`,
      [ID_ROL_CLIENTE],
    );
  }

  static async ObtenerPorId(id_usuario: number) {
    const [cliente] = await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo, fecha_creacion
       FROM usuarios WHERE id_usuario = ? AND id_rol = ?`,
      [id_usuario, ID_ROL_CLIENTE],
    );
    return cliente ?? null;
  }

  static async CambiarEstado(id_usuario: number, nuevoEstado: 0 | 1) {
    const result = await conexion.execute(
      `UPDATE usuarios SET activo = ? WHERE id_usuario = ? AND id_rol = ?`,
      [nuevoEstado, id_usuario, ID_ROL_CLIENTE],
    );
    if (result.affectedRows === 0) {
      return { success: false, message: "Cliente no encontrado" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }

  static async Editar(id_usuario: number, datos: EditarClienteData) {
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

    valores.push(id_usuario, ID_ROL_CLIENTE);
    const result = await conexion.execute(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id_usuario = ? AND id_rol = ?`,
      valores,
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Cliente no encontrado" };
    }
    return { success: true, message: "Cliente actualizado correctamente" };
  }
}
