import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Empresa } from "../../Models/Empresa.model.ts";
import { Producto } from "../../Models/Producto.model.ts";

// GET /cliente/proveedores
export const obtenerProveedores = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const ObjEmpresa = new Empresa();
    const resultado = await ObjEmpresa.ObtenerActivas();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las empresas" };
  }
};

// GET /cliente/proveedores/:idEmpresa/productos
export const obtenerProductosEmpresa = async (ctx: RouterContext<string>) => {
  const { response, params } = ctx;
  try {
    const idEmpresa = Number(params.idEmpresa);
    if (!idEmpresa) {
      response.status = 400;
      response.body = { success: false, message: "Id de empresa inválido" };
      return;
    }

    const ObjProducto = new Producto(null, idEmpresa);
    const resultado = await ObjProducto.ObtenerActivosPorEmpresa();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los productos" };
  }
};