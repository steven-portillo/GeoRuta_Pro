import { conexion } from "../conexion.ts";
import { eliminarArchivo } from "../../Helpers/archivos.ts";

interface EditarEmpresaData {
  nombre?: string;
  descripcion?: string;
  logo_url?: string;
  color_primario?: string;
  color_acento?: string;
}

export class EmpresaPerfil {
  static async Obtener(id_empresa: number) {
    const [empresa] = await conexion.query(
      `SELECT id_empresa, nombre, descripcion, logo_url, color_primario, color_acento
       FROM empresas WHERE id_empresa = ?`,
      [id_empresa],
    );
    return empresa ?? null;
  }

  static async Editar(id_empresa: number, datos: EditarEmpresaData) {
    const campos: string[] = [];
    const valores: unknown[] = [];

    if (datos.nombre) {
      campos.push("nombre = ?");
      valores.push(datos.nombre);
    }
    if (datos.descripcion !== undefined) {
      campos.push("descripcion = ?");
      valores.push(datos.descripcion);
    }
    if (datos.color_primario) {
      campos.push("color_primario = ?");
      valores.push(datos.color_primario);
    }
    if (datos.color_acento) {
      campos.push("color_acento = ?");
      valores.push(datos.color_acento);
    }

    let logoAnterior: string | null = null;
    if (datos.logo_url) {
      const [actual] = await conexion.query(
        `SELECT logo_url FROM empresas WHERE id_empresa = ?`,
        [id_empresa],
      );
      logoAnterior = actual?.logo_url ?? null;
      campos.push("logo_url = ?");
      valores.push(datos.logo_url);
    }

    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }

    valores.push(id_empresa);
    await conexion.execute(
      `UPDATE empresas SET ${campos.join(", ")} WHERE id_empresa = ?`,
      valores,
    );

    if (logoAnterior) {
      await eliminarArchivo(logoAnterior);
    }

    return { success: true, message: "Empresa actualizada correctamente" };
  }

  static async EliminarLogo(id_empresa: number) {
    const [empresa] = await conexion.query(
      `SELECT logo_url FROM empresas WHERE id_empresa = ?`,
      [id_empresa],
    );
    if (!empresa?.logo_url) {
      return { success: false, message: "No hay logo para eliminar" };
    }

    await conexion.execute(
      `UPDATE empresas SET logo_url = NULL WHERE id_empresa = ?`,
      [id_empresa],
    );
    await eliminarArchivo(empresa.logo_url);

    return { success: true, message: "Logo eliminado" };
  }
}
