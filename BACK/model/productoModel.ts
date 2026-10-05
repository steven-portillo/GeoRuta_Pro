import {conexion} from "./conexion.ts"

interface Producto {
    id_producto: number;
    nombre: string;
    descripcion: string;
    precio: number;
}

export class ProductoModel {
    public _objProducto: Producto | null;
    public _id_producto: number | null;

    constructor(objProducto: Producto | null = null, id_producto: number | null = null) {
        this._objProducto = objProducto
        this._id_producto = id_producto;
    }


    // Muestra el producto por id seleccionado
    public async getProductoId(): Promise<Producto | null> {
        const result = await conexion.query(`
            SELECT id_producto, nombre, descripcion, precio FROM productos WHERE id_producto = ? AND activo = 1`, 
            [this._id_producto]
        );
        return result[0] || null;
    }


    //Lista todos los productos
    public async getProducto():Promise<Producto[]>{
        const result = await conexion.query(`
            SELECT id_producto, nombre, descripcion, precio FROM productos
            `)
        return result as Producto[];
    }

}