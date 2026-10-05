import { Context } from "../dependencies/dependencias.ts";
import { ProductoModel } from "../model/productoModel.ts";
import { InventarioModel } from "../model/inventarioModel.ts";

export const getProductos = async(ctx: Context) => {

    const {response} = ctx

    try {
        const objProductos = new ProductoModel();
        const listaProductos = await objProductos.getProducto()
        if (!listaProductos) {
            response.status = 401
            response.body = {
                success: false,
                message: "Error aal obtener los productos"
            }
        } else {
            response.status = 201
            response.body = {
                success: true,
                data: listaProductos
            }
        }
    } catch (error) {
        response.status = 500
        response.body = {
            success: false,
            message: 'Error en el servidor' + error
        }
    }
}

export const getStock = async(ctx:Context) => {
    const {response} = ctx;

    try {
        
        const obj = new InventarioModel()
        const list = await obj.stockDisponible();
        if (!list) {
            response.status = 401;
            response.body = {
                success: false,
                message: "error al mostrar el stock disponible"
            }
        } else {
            response.status = 201;
            response.body = {
                success: true,
                data: list
            }
        }
    } catch (error) {
        response.status = 500
        response.body = {
            success: false,
            message: "Error al conectar con el servidor" + error
        }
    }
}