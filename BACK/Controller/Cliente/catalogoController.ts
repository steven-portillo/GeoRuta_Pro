import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { CatalogoCliente } from "../../Model/Cliente/CatalogoModel.ts";

export const listarEmpresasCatalogo = async (ctx: Context) => {
  try {
    const empresas = await CatalogoCliente.ListarEmpresas();
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: empresas };
  } catch (error) {
    console.error("Error listar empresas del catálogo:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const listarProductosEmpresa = async (
  ctx: RouterContext<"/api/cliente/empresas/:id/productos">,
) => {
  try {
    const id_empresa = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_empresa) || id_empresa <= 0) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "ID de empresa inválido" };
      return;
    }
    const productos = await CatalogoCliente.ListarProductos(id_empresa);
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: productos };
  } catch (error) {
    console.error("Error listar productos del catálogo:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};

export const obtenerProductoCatalogo = async (
  ctx: RouterContext<"/api/cliente/productos/:id">,
) => {
  try {
    const id_producto = Number(ctx.params.id);
    if (!Number.isSafeInteger(id_producto) || id_producto <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de producto inválido",
      };
      return;
    }
    const producto = await CatalogoCliente.ObtenerProducto(id_producto);
    if (!producto) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Producto no encontrado" };
      return;
    }
    ctx.response.status = 200;
    ctx.response.body = { success: true, data: producto };
  } catch (error) {
    console.error("Error obtener producto del catálogo:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor",
    };
  }
};
