import { conexion } from "../conexion.ts";

interface CategoriaData {
  nombre: string;
  descripcion?: string;
}

interface EditarCategoriaData {
  nombre?: string;
  descripcion?: string;
}

export class Categoria {
  static async Listar(id_empresa: number) {
    return await conexion.query(
      `SELECT id_categoria, nombre, descripcion, activo
       FROM categorias
       WHERE id_empresa = ?
       ORDER BY nombre ASC`,
      [id_empresa],
    );
  }

  static async Crear(id_empresa: number, datos: CategoriaData) {
    const [existente] = await conexion.query(
      `SELECT id_categoria FROM categorias WHERE id_empresa = ? AND nombre = ?`,
      [id_empresa, datos.nombre],
    );

    if (existente) {
      return {
        success: false,
        message: "Ya existe una categoría con ese nombre en tu empresa",
      };
    }

    const result = await conexion.execute(
      `INSERT INTO categorias (id_empresa, nombre, descripcion, activo)
       VALUES (?, ?, ?, 1)`,
      [id_empresa, datos.nombre, datos.descripcion ?? null],
    );

    return {
      success: true,
      message: "Categoría creada correctamente",
      id: result.lastInsertId as number,
    };
  }

  static async Editar(
    id_categoria: number,
    id_empresa: number,
    datos: EditarCategoriaData,
  ) {
    const categoria = await Categoria.ObtenerPorId(id_categoria, id_empresa);
    if (!categoria) {
      return { success: false, message: "Categoría no encontrada" };
    }

    if (datos.nombre && datos.nombre !== categoria.nombre) {
      const [existente] = await conexion.query(
        `SELECT id_categoria FROM categorias WHERE id_empresa = ? AND nombre = ? AND id_categoria != ?`,
        [id_empresa, datos.nombre, id_categoria],
      );
      if (existente) {
        return {
          success: false,
          message: "Ya existe una categoría con ese nombre en tu empresa",
        };
      }
    }

    await conexion.execute(
      `UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ? AND id_empresa = ?`,
      [
        datos.nombre ?? categoria.nombre,
        datos.descripcion ?? categoria.descripcion,
        id_categoria,
        id_empresa,
      ],
    );

    return { success: true, message: "Categoría actualizada correctamente" };
  }

  static async CambiarEstado(
    id_categoria: number,
    id_empresa: number,
    nuevoEstado: 0 | 1,
  ) {
    const result = await conexion.execute(
      `UPDATE categorias SET activo = ? WHERE id_categoria = ? AND id_empresa = ?`,
      [nuevoEstado, id_categoria, id_empresa],
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Categoría no encontrada" };
    }
    return { success: true, message: "Estado actualizado correctamente" };
  }

  /** Trae la categoría SOLO si pertenece a la empresa dada — esto es lo que evita que adivinando el ID se toque otra empresa */
  static async ObtenerPorId(id_categoria: number, id_empresa: number) {
    const [categoria] = await conexion.query(
      `SELECT id_categoria, nombre, descripcion, activo
     FROM categorias WHERE id_categoria = ? AND id_empresa = ?`,
      [id_categoria, id_empresa],
    );
    return categoria ?? null;
  }
}
