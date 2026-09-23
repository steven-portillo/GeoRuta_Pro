import { RouterContext } from "../../Dependencies/Dependencias.ts";
import { Producto } from "../../Models/Producto.model.ts";
import { Categoria } from "../../Models/Categoria.model.ts";
import {
  EsquemaGuardarProducto,
  EsquemaToggleProducto,
  EsquemaCrearCategoria,
  EsquemaEliminarCategoria,
  EsquemaRenombrarCategoria,
} from "../../Helpers/EsquemasValidacion.ts";
import { guardarImagenProducto } from "../../Helpers/GestorArchivos.ts";
import { obtenerUsuarioAutenticado } from "../../Helpers/ContextoAuth.ts";

// ════════════════════════ PRODUCTOS ════════════════════════

// GET /admin/productos
export const obtenerProductos = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjProducto = new Producto(null, idEmpresa);
    const resultado = await ObjProducto.ObtenerPorEmpresa();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener los productos" };
  }
};

// POST /admin/productos (form-data: nombre, idCategoria, precio, stock, descripcion?, idProducto?, imagen?)
export const guardarProducto = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const cuerpoFormData = await request.body.formData();

    let imagen: File | null = null;
    const campos: Record<string, string> = {};

    for (const [clave, valor] of cuerpoFormData.entries()) {
      if (valor instanceof File) {
        if (clave === "imagen" && valor.size > 0) imagen = valor;
      } else {
        campos[clave] = valor;
      }
    }

    const resultado = EsquemaGuardarProducto.safeParse(campos);
    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const imagenUrl = imagen ? await guardarImagenProducto(imagen) : null;
    const { idProducto, ...datosProducto } = resultado.data;

    if (!idProducto) {
      const ObjProducto = new Producto(null, idEmpresa, { ...datosProducto, imagenUrl });
      const resultadoCrear = await ObjProducto.Crear();

      response.status = resultadoCrear.success ? 201 : 400;
      response.body = resultadoCrear;
    } else {
      const ObjProducto = new Producto(idProducto, idEmpresa, { ...datosProducto, imagenUrl });
      const resultadoActualizar = await ObjProducto.Actualizar();

      response.status = resultadoActualizar.success ? 200 : 400;
      response.body = resultadoActualizar;
    }
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible guardar el producto",
    };
  }
};

// POST /admin/productos/toggle
export const toggleProducto = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaToggleProducto.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const ObjProducto = new Producto(resultado.data.idProducto);
    const resultadoToggle = await ObjProducto.Toggle();

    response.status = resultadoToggle.success ? 200 : 400;
    response.body = resultadoToggle;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible cambiar el estado del producto" };
  }
};

// ════════════════════════ CATEGORÍAS ════════════════════════

// GET /admin/categorias
export const obtenerCategorias = async (ctx: RouterContext<string>) => {
  const { response } = ctx;
  try {
    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjCategoria = new Categoria(null, idEmpresa);
    const resultado = await ObjCategoria.ObtenerPorEmpresa();

    response.status = resultado.success ? 200 : 400;
    response.body = resultado;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible obtener las categorías" };
  }
};

// POST /admin/categorias
export const crearCategoria = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaCrearCategoria.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjCategoria = new Categoria(null, idEmpresa, resultado.data);
    const resultadoCrear = await ObjCategoria.Crear();

    response.status = resultadoCrear.success ? 201 : 409;
    response.body = resultadoCrear;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible crear la categoría" };
  }
};

// POST /admin/categorias/eliminar
export const eliminarCategoria = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaEliminarCategoria.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = { success: false, message: "Datos inválidos" };
      return;
    }

    const ObjCategoria = new Categoria(resultado.data.idCategoria);
    const resultadoEliminar = await ObjCategoria.Eliminar();

    response.status = resultadoEliminar.success ? 200 : 409;
    response.body = resultadoEliminar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible eliminar la categoría" };
  }
};

// POST /admin/categorias/renombrar
export const renombrarCategoria = async (ctx: RouterContext<string>) => {
  const { request, response } = ctx;
  try {
    const cuerpo = await request.body.json();
    const resultado = EsquemaRenombrarCategoria.safeParse(cuerpo);

    if (!resultado.success) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Datos inválidos",
        errors: resultado.error.flatten().fieldErrors,
      };
      return;
    }

    const { idEmpresa } = obtenerUsuarioAutenticado(ctx);
    const ObjCategoria = new Categoria(resultado.data.idCategoria, idEmpresa);
    const resultadoRenombrar = await ObjCategoria.Renombrar(resultado.data.nuevoNombre);

    response.status = resultadoRenombrar.success ? 200 : 409;
    response.body = resultadoRenombrar;
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = { success: false, message: "No fue posible renombrar la categoría" };
  }
};