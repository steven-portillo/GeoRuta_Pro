import { conexion } from "./Conexion.ts";
import { CATEGORIAS_BASE } from "./Empresa.model.ts";

interface CategoriaRow {
  id_categoria: number;
  nombre: string;
}

export class Categoria {
  public _idCategoria: number | null;
  public _idEmpresa: number | null;
  public _ObjCategoria: { nombre: string } | null;

  constructor(
    idCategoria: number | null = null,
    idEmpresa: number | null = null,
    ObjCategoria: { nombre: string } | null = null,
  ) {
    this._idCategoria = idCategoria;
    this._idEmpresa = idEmpresa;
    this._ObjCategoria = ObjCategoria;
  }

  // trae las categorias activas de la empresa; si no tiene ninguna, crea las base automaticamente
  // (mismo comportamiento "auto-seed" que tenia el ObtenerCategorias original)
  public async ObtenerPorEmpresa(): Promise<{ success: boolean; message: string; data?: CategoriaRow[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      let { rows: categorias } = await conexion.execute(
        `SELECT id_categoria, nombre FROM categorias WHERE id_empresa = ? AND activo = 1 ORDER BY nombre`,
        [this._idEmpresa],
      );

      if (!categorias || categorias.length === 0) {
        const valores = CATEGORIAS_BASE.map(() => "(?, ?, 1)").join(", ");
        const parametros = CATEGORIAS_BASE.flatMap((nombre) => [this._idEmpresa, nombre]);

        try {
          await conexion.execute(
            `INSERT INTO categorias (id_empresa, nombre, activo) VALUES ${valores}`,
            parametros,
          );
        } catch {
          // ignora si ya existen por el constraint UNIQUE (misma logica que el original)
        }

        const resultado = await conexion.execute(
          `SELECT id_categoria, nombre FROM categorias WHERE id_empresa = ? AND activo = 1 ORDER BY nombre`,
          [this._idEmpresa],
        );
        categorias = resultado.rows;
      }

      return { success: true, message: "Categorías obtenidas", data: categorias as CategoriaRow[] };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener las categorías" };
    }
  }

  // crea una categoria nueva, validando que no exista otra con el mismo nombre (case-insensitive)
  public async Crear(): Promise<{ success: boolean; message: string; data?: { id: number; nombre: string } }> {
    const datos = this._ObjCategoria;
    if (!this._idEmpresa || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: existentes } = await conexion.execute(
        `SELECT id_categoria FROM categorias WHERE id_empresa = ? AND LOWER(nombre) = LOWER(?)`,
        [this._idEmpresa, datos.nombre],
      );
      if ((existentes?.length ?? 0) > 0) {
        return { success: false, message: "Ya existe una categoría con ese nombre" };
      }

      const { lastInsertId } = await conexion.execute(
        `INSERT INTO categorias (id_empresa, nombre, activo) VALUES (?, ?, 1)`,
        [this._idEmpresa, datos.nombre],
      );

      return {
        success: true,
        message: "Categoría creada correctamente",
        data: { id: lastInsertId as number, nombre: datos.nombre },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible crear la categoría" };
    }
  }

  // desactiva una categoria (soft delete); rechaza si tiene productos activos asociados
  public async Eliminar(): Promise<{ success: boolean; message: string }> {
    if (!this._idCategoria) return { success: false, message: "Categoría no identificada" };

    try {
      const { rows: productos } = await conexion.execute(
        `SELECT id_producto FROM productos WHERE id_categoria = ? AND activo = 1`,
        [this._idCategoria],
      );
      const totalAsociados = productos?.length ?? 0;

      if (totalAsociados > 0) {
        return {
          success: false,
          message: `No puedes eliminar esta categoría porque tiene ${totalAsociados} producto(s) activo(s) asociado(s)`,
        };
      }

      await conexion.execute(`UPDATE categorias SET activo = 0 WHERE id_categoria = ?`, [this._idCategoria]);

      return { success: true, message: "Categoría eliminada correctamente" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible eliminar la categoría" };
    }
  }

  // renombra una categoria, validando que el nuevo nombre no choque con otra existente
  public async Renombrar(nuevoNombre: string): Promise<{ success: boolean; message: string }> {
    if (!this._idCategoria || !this._idEmpresa) return { success: false, message: "Datos incompletos" };

    try {
      const { rows: existentes } = await conexion.execute(
        `SELECT id_categoria FROM categorias
         WHERE id_empresa = ? AND LOWER(nombre) = LOWER(?) AND id_categoria != ?`,
        [this._idEmpresa, nuevoNombre, this._idCategoria],
      );
      if ((existentes?.length ?? 0) > 0) {
        return { success: false, message: "Ya existe una categoría con ese nombre" };
      }

      await conexion.execute(`UPDATE categorias SET nombre = ? WHERE id_categoria = ?`, [
        nuevoNombre,
        this._idCategoria,
      ]);

      return { success: true, message: "Categoría actualizada" };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible renombrar la categoría" };
    }
  }
}