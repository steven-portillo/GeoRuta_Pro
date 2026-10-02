import { conexion } from "../conexion.ts";
import { hash } from "../../Dependencies/dependencias.ts";

const ID_ROL_PROVEEDOR = 3;

interface CrearProveedorData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

interface EditarProveedorData {
  nombre?: string;
  apellido?: string;
  email?: string;
}

export class Proveedor {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo, fecha_creacion
       FROM usuarios
       WHERE id_empresa = ? AND id_rol = ?
       ORDER BY fecha_creacion DESC`,
      [id_empresa, ID_ROL_PROVEEDOR],
    );
  }

  static async ObtenerPorId(id_usuario: number, id_empresa: number) {
    const [proveedor] = await conexion.query(
      `SELECT id_usuario, nombre, apellido, email, imagen_url, activo
       FROM usuarios
       WHERE id_usuario = ? AND id_empresa = ? AND id_rol = ?`,
      [id_usuario, id_empresa, ID_ROL_PROVEEDOR],
    );
    return proveedor ?? null;
  }

  static async Crear(id_empresa: number, datos: CrearProveedorData) {
    const [existente] = await conexion.query(
      `SELECT id_usuario FROM usuarios WHERE email = ?`,
      [datos.email],
    );
    if (existente) {
      return {
        success: false,
        message: "El correo electrónico ya está registrado",
      };
    }

    const passwordHasheado = await hash(datos.password);

    const result = await conexion.execute(
      `INSERT INTO usuarios
        (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 1, CURRENT_TIMESTAMP)`,
      [
        id_empresa,
        ID_ROL_PROVEEDOR,
        datos.nombre,
        datos.apellido,
        datos.email,
        passwordHasheado,
      ],
    );

    return {
      success: true,
      message: "Proveedor creado correctamente",
      id: result.lastInsertId as number,
    };
  }

  static async Editar(
    id_usuario: number,
    id_empresa: number,
    datos: EditarProveedorData,
  ) {
    const proveedor = await Proveedor.ObtenerPorId(id_usuario, id_empresa);
    if (!proveedor) {
      return { success: false, message: "Proveedor no encontrado" };
    }

    if (datos.email && datos.email !== proveedor.email) {
      const [existente] = await conexion.query(
        `SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?`,
        [datos.email, id_usuario],
      );
      if (existente) {
        return {
          success: false,
          message: "El correo electrónico ya está registrado",
        };
      }
    }

    await conexion.execute(
      `UPDATE usuarios SET nombre = ?, apellido = ?, email = ?
       WHERE id_usuario = ? AND id_empresa = ? AND id_rol = ?`,
      [
        datos.nombre ?? proveedor.nombre,
        datos.apellido ?? proveedor.apellido,
        datos.email ?? proveedor.email,
        id_usuario,
        id_empresa,
        ID_ROL_PROVEEDOR,
      ],
    );

    return { success: true, message: "Proveedor actualizado correctamente" };
  }

  static async CambiarEstado(
    id_usuario: number,
    id_empresa: number,
    nuevoEstado: 0 | 1,
  ) {
    const result = await conexion.execute(
      `UPDATE usuarios SET activo = ? WHERE id_usuario = ? AND id_empresa = ? AND id_rol = ?`,
      [nuevoEstado, id_usuario, id_empresa, ID_ROL_PROVEEDOR],
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Proveedor no encontrado" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }
}
