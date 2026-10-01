import { conexion } from "../conexion.ts";
import { hash } from "../../Dependencies/dependencias.ts";

interface ProveedorData {
  nombreProveedor: string;
  apellidoProveedor: string;
  emailProveedor: string;
  passwordProveedor?: string;
  idEmpresa: number;
  imagen_url?: string;
}

export class Proveedor {
  public _ObjProveedor: ProveedorData | null;
  constructor(ObjProveedor: ProveedorData | null = null) {
    this._ObjProveedor = ObjProveedor;
  }

  static async ListarProveedores(idEmpresa: number) {
    return await conexion.query(
      `select 
            u.id_usuario, e.id_empresa, concat(u.nombre," ", u.apellido) as nombre_proveedor,
            u.email, u.imagen_url, u.activo
            from usuarios u
            inner join empresas e on u.id_empresa = e.id_empresa and u.id_rol = 3
            where u.id_empresa = ? 
            `,
      [idEmpresa],
    );
  }

  static async ObtenerProveedor(id: number, idEmpresa: number) {
    const [proveedor] = await conexion.query(
      `select
            u.id_usuario, e.id_empresa, u.nombre, u.apellido, u.email, u.imagen_url, u.activo
            from usuarios u
            inner join empresas e on u.id_empresa = e.id_empresa and u.id_rol = 3
            where u.id_usuario = ? and u.id_empresa = ?
            `,
      [id, idEmpresa],
    );
    return proveedor ?? null;
  }

  public async CrearProveedor(): Promise<
    | { success: true; message: string }
    | { success: false; message: string }
  > {
    try {
      const p = this._ObjProveedor;
      if (!p) {
        return {
          success: false,
          message: "No se recibieron datos para crear un Repartidor",
        };
      }

      const passwordHasheado = await hash(p.passwordProveedor!);

      await conexion.execute(
        `insert into usuarios
                (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
                values (?,3,?,?,?,?,NULL,1, CURRENT_TIMESTAMP)`,
        [
          p.idEmpresa,
          p.nombreProveedor,
          p.apellidoProveedor,
          p.emailProveedor,
          passwordHasheado,
        ],
      );

      return { success: true, message: "Repartidor creado correctamente" };
    } catch (error) {
      console.log("Error en el metodo CrearProveedr: " + error);
      return { success: false, message: "Error al crear el repartidor" };
    }
  }

  static async EditarProveedor(
    id: number,
    datos: ProveedorData,
    idEmpresa: number,
  ): Promise<
    | { success: true; message: string }
    | { success: false; message: string }
  > {
    const proveedor = await Proveedor.obtenerPropio(id, idEmpresa);
    if (!proveedor) {
      return { success: false, message: "Repartidor no encontrado" };
    }

    try {
      if (datos.imagen_url === undefined) {
        await conexion.execute(
          `update usuarios set nombre = ?, apellido = ?, email = ? where id_usuario = ? and id_empresa = ?`,
          [datos.nombreProveedor, datos.apellidoProveedor, datos.emailProveedor, id, idEmpresa],
        );
      } else {
        await conexion.execute(
          `update usuarios set nombre = ?, apellido = ?, email = ?, imagen_url = ? where id_usuario = ? and id_empresa = ?`,
          [datos.nombreProveedor, datos.apellidoProveedor, datos.emailProveedor, datos.imagen_url, id, idEmpresa],
        );
      }
      return { success: true, message: "Repartidor actualizado correctamente" };
    } catch (error) {
      console.log("Error en el metodo EditarProveedr: " + error);
      return { success: false, message: "Error al editar el repartidor" };
    }
  }

  static async CambiarEstado(
    id_proveedor: number,
    id_empresa: number,
    nuevoEstado: 0 | 1,
  ) {
    const result = await conexion.execute(
      `UPDATE usuarios SET activo = ? WHERE id_usuario = ? AND id_empresa = ?`,
      [nuevoEstado, id_proveedor, id_empresa],
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Repartidor no encontrado" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }

  private static async obtenerPropio(id: number, idEmpresa: number) {
    const [proveedor] = await conexion.query(
      `
            select id_usuario, nombre, apellido, email 
            from usuarios
            where id_usuario = ? 
            and id_empresa = ?
            `,
      [id, idEmpresa],
    );
    return proveedor ?? null;
  }
}
