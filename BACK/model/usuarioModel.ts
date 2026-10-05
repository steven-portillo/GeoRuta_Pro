import { conexion } from "./conexion.ts";

export interface Usuario {
  id_usuario: number;
  id_empresa: number | null;
  id_rol: number;
  nombre: string;
  apellido: string;
  email: string;
  password_hash: string;
  imagen_url: string | null;
  activo: number;
  nombre_rol?: string;
}

export class UsuarioModel {
  public static async buscarPorEmail(email: string): Promise<Usuario | null> {
    const filas = await conexion.query(
      `SELECT u.*, r.nombre_rol 
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.email = ?`,
      [email],
    );
    return filas[0] ?? null;
  }

  public static async buscarPorId(id: number): Promise<Usuario | null> {
    const filas = await conexion.query(
      `SELECT u.*, r.nombre_rol 
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [id],
    );
    return filas[0] ?? null;
  }

  public static async crearUsuarioGoogle(data: {
    nombre: string;
    apellido: string;
    email: string;
    imagen_url: string | null;
  }): Promise<number> {
    const result = await conexion.execute(
      `INSERT INTO usuarios 
        (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
       VALUES (NULL, 4, ?, ?, ?, '(GOOGLE_HASH)', ?, 1, NOW())`,
      [data.nombre, data.apellido, data.email, data.imagen_url],
    );
    return result.lastInsertId as number;
  }
}