import { conexion } from "./Conexion.ts";

interface ProductoData {
  nombre: string;
  descripcion?: string;
  idCategoria: number;
  precio: number;
  stock: number;
  imagenUrl?: string | null;
}

interface ProductoRow {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  id_categoria: number;
  precio: number;
  imagen_url: string | null;
  activo: number;
  stock: number;
}

export class Producto {
  public _idProducto: number | null;
  public _idEmpresa: number | null;
  public _ObjProducto: ProductoData | null;

  constructor(
    idProducto: number | null = null,
    idEmpresa: number | null = null,
    ObjProducto: ProductoData | null = null,
  ) {
    this._idProducto = idProducto;
    this._idEmpresa = idEmpresa;
    this._ObjProducto = ObjProducto;
  }

  // trae todos los productos de la empresa, con su categoria y stock actual
  public async ObtenerPorEmpresa(): Promise<{ success: boolean; message: string; data?: ProductoRow[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT p.id_producto, p.nombre, p.descripcion, c.nombre AS categoria, c.id_categoria,
                p.precio, p.imagen_url, p.activo, IFNULL(i.stock_disponible, 0) AS stock
         FROM productos p
         INNER JOIN categorias c ON p.id_categoria = c.id_categoria
         LEFT JOIN inventario i ON p.id_producto = i.id_producto
         WHERE p.id_empresa = ?
         ORDER BY p.fecha_creacion DESC`,
        [this._idEmpresa],
      );

      return { success: true, message: "Productos obtenidos", data: rows as ProductoRow[] };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los productos" };
    }
  }

  // crea un producto nuevo junto con su registro de inventario inicial
  public async Crear(): Promise<{ success: boolean; message: string; data?: { id: number; imagenUrl: string } }> {
    const datos = this._ObjProducto;
    if (!this._idEmpresa || !datos) return { success: false, message: "Datos incompletos" };

    try {
      const { lastInsertId: idProducto } = await conexion.execute(
        `INSERT INTO productos (id_empresa, id_categoria, nombre, descripcion, precio, imagen_url, activo)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [this._idEmpresa, datos.idCategoria, datos.nombre, datos.descripcion ?? null, datos.precio, datos.imagenUrl ?? null],
      );

      await conexion.execute(
        `INSERT INTO inventario (id_producto, stock_disponible, stock_reservado, stock_minimo)
         VALUES (?, ?, 0, 0)`,
        [idProducto, datos.stock],
      );

      return {
        success: true,
        message: "Producto agregado correctamente",
        data: { id: idProducto as number, imagenUrl: datos.imagenUrl ?? "" },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible crear el producto" };
    }
  }

  // actualiza un producto existente; la imagen solo se actualiza si vino una nueva
  public async Actualizar(): Promise<{ success: boolean; message: string; data?: { imagenUrl: string } }> {
    const datos = this._ObjProducto;
    if (!this._idProducto || !datos) return { success: false, message: "Datos incompletos" };

    try {
      if (datos.imagenUrl) {
        await conexion.execute(
          `UPDATE productos SET nombre = ?, descripcion = ?, id_categoria = ?, precio = ?, imagen_url = ?
           WHERE id_producto = ?`,
          [datos.nombre, datos.descripcion ?? null, datos.idCategoria, datos.precio, datos.imagenUrl, this._idProducto],
        );
      } else {
        await conexion.execute(
          `UPDATE productos SET nombre = ?, descripcion = ?, id_categoria = ?, precio = ?
           WHERE id_producto = ?`,
          [datos.nombre, datos.descripcion ?? null, datos.idCategoria, datos.precio, this._idProducto],
        );
      }

      // upsert de inventario: crea el registro si no existe, o actualiza el stock si ya existe
      await conexion.execute(
        `INSERT INTO inventario (id_producto, stock_disponible, stock_reservado, stock_minimo)
         VALUES (?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE stock_disponible = ?, ultima_actualizacion = NOW()`,
        [this._idProducto, datos.stock, datos.stock],
      );

      return {
        success: true,
        message: "Producto actualizado correctamente",
        data: { imagenUrl: datos.imagenUrl ?? "" },
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible actualizar el producto" };
    }
  }

  // activa/desactiva un producto y devuelve el nuevo estado
  public async Toggle(): Promise<{ success: boolean; message: string; activo?: boolean }> {
    if (!this._idProducto) return { success: false, message: "Producto no identificado" };

    try {
      await conexion.execute(
        `UPDATE productos SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END WHERE id_producto = ?`,
        [this._idProducto],
      );

      const { rows } = await conexion.execute(`SELECT activo FROM productos WHERE id_producto = ?`, [
        this._idProducto,
      ]);
      const nuevoEstado = Boolean((rows?.[0] as { activo: number })?.activo);

      return {
        success: true,
        message: nuevoEstado ? "Producto activado" : "Producto desactivado",
        activo: nuevoEstado,
      };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible cambiar el estado del producto" };
    }
  }
    // catalogo publico: solo productos activos, ordenados por categoria (distinto de ObtenerPorEmpresa,
  // que Admin usa y trae tambien los inactivos para poder reactivarlos)
  public async ObtenerActivosPorEmpresa(): Promise<{ success: boolean; message: string; data?: unknown[] }> {
    if (!this._idEmpresa) return { success: false, message: "Empresa no identificada" };

    try {
      const { rows } = await conexion.execute(
        `SELECT p.id_producto, p.nombre, p.descripcion, c.nombre AS categoria,
                p.precio, p.imagen_url, IFNULL(i.stock_disponible, 0) AS stock
         FROM productos p
         INNER JOIN categorias c ON p.id_categoria = c.id_categoria
         LEFT JOIN inventario i ON p.id_producto = i.id_producto
         WHERE p.id_empresa = ? AND p.activo = 1
         ORDER BY c.nombre, p.nombre`,
        [this._idEmpresa],
      );

      const productos = (rows as Record<string, unknown>[]).map((fila) => ({
        id: fila.id_producto,
        nombre: fila.nombre,
        descripcion: fila.descripcion ?? "",
        categoria: fila.categoria,
        precio: fila.precio,
        imagenUrl: fila.imagen_url ?? "",
        stock: fila.stock,
      }));

      return { success: true, message: "Productos obtenidos", data: productos };
    } catch (error) {
      console.error(error);
      return { success: false, message: "No fue posible obtener los productos" };
    }
  }
}