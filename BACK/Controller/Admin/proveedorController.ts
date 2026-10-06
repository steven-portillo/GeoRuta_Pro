import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { validarArchivo,generarRutaArchivo,  escribirArchivo } from "../../Helpers/archivos.ts";
import { Proveedor } from "../../Model/Admin/ProveedorModel.ts";
import { Usuario } from "../../Model/Auth/UsuarioModel.ts";
import type { Sesion } from "../../Utils/tipos.ts";

//GET /api/empresa/proveedores
export const listarProveedores = async (ctx: Context) => {
  const { state, response } = ctx;
  try {
    const sesion = state.user as Sesion;
    if (!sesion.id) {
      response.status = 401;
      response.body = { success: false, message: "No autenticado" };
      return;
    }

    const proveedores = await Proveedor.ListarProveedores(sesion.idEmpresa!);

    response.status = 200;
    response.body = { success: true, data: proveedores };
  } catch (error) {
    console.log("Error en el controller lista proveedor: " + error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor al listar repartidores",
    };
  }
};  


export const obtenerProveedor = async (ctx: RouterContext<string>) => {
  const { state, response, params } = ctx;
  try {
    const sesion = state.user as Sesion;
    const idProveedor = Number(params.id);

    if (!sesion.id) {
      response.status = 401;
      response.body = { success: false, message: "No autenticado" };
      return;
    }
    if (Number.isNaN(idProveedor)) {
        response.status = 400;
        response.body = { success: false,
            message: "ID Invalido"
        }
        return;
    }

    const proveedor = await Proveedor.ObtenerProveedor(idProveedor, sesion.idEmpresa!);
    if (!proveedor) {
      response.status = 404;
      response.body = { success: false, message: "Repartidor no encontrado" };
      return;
    }
    response.status = 200;
    response.body = { success: true, data: proveedor };
  } catch (error) {
    console.log("Error en el controller obtener proveedor: " + error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor al obtener repartidor",
    };
  }
};

//POST  /api/empresa/crear-proveedor
export const crearProveedor = async (ctx: Context) => {
  const { request, response, state } = ctx;
  try {
    const body = await request.body.json();

    const sesion = state.user as Sesion;
    if (!sesion.id) {
      response.status = 401;
      response.body = { success: false, message: "No autenticado" };
      return;
    }
    const idEmpresa = sesion.idEmpresa;
    const nombre = body.nombre ?? body.nombres;
    const apellido = body.apellido ?? body.apellidos;
    const { email, password } = body;

    if (!nombre || !apellido || !email || !password || !idEmpresa) {
      response.status = 400;
      response.body = {
        success: false,
        message:
          "Faltan campos obligatorios: nombre, apellido, email, password.",
      };
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status = 400;
      response.body = {
        success: false,
        message: "Correo electrónico no válido",
      };
      return;
    }

    const existeEmail = await new Usuario().existeEmail(email);
    if (existeEmail) {
      response.status = 409;
      response.body = {
        success: false,
        message: "Este correo ya está registrado",
      };
      return;
    }

    const objProveedor = new Proveedor({
      nombreProveedor: nombre,
      apellidoProveedor: apellido,
      emailProveedor: email,
      passwordProveedor: password,
      idEmpresa: idEmpresa,
    });

    const result = await objProveedor.CrearProveedor();

    if (result.success) {
      response.status = 201;
      response.body = { success: true, message: result.message };
    } else {
      response.status = 400;
      response.body = { success: false, message: result.message };
    }
  } catch (error) {
    console.log("Error en el controller de crear proveedor: " + error);
    response.status = 500;
    response.body = { success: false, message: "Error interno del servidor" };
  }
};



// PUT /api/admin/proveedor/:id/
export const editarProveedor = async (ctx: RouterContext<string>) => {
  const { response, request, params, state } = ctx;
  try {
    const sesion = state.user as Sesion;
    const idProveedor = Number(params.id);

    if (!sesion.id) {
      response.status = 401;
      response.body = { success: false, message: "No autenticado" };
      return;
    }

    if (Number.isNaN(idProveedor)) {
        response.status = 400;
        response.body = { success: false, 
            message: "ID Invalido"
        }
        return;
    };
    const form = await request.body.formData();
    
    const nombre = form.get("nombre")?.toString().trim() ?? "";
    const apellido = form.get("apellido")?.toString().trim() ?? "";
    const email = form.get("email")?.toString().trim() ?? "";
    const imagen = form.get("imagen") as File | null;

    if(!nombre || !apellido || !email || !sesion.idEmpresa){
      response.status = 400;
      response.body = { success: false, message:"faltan campos obligatorios"};
      return;
    }

    if (await new Usuario().existeEmail(email, idProveedor)) {
        response.status = 409;
        response.body = {
        success: false,
        message: "Este correo ya está registrado",
      };
      return;
    }

    let rutaImagen: string | undefined = undefined;
    if (imagen !== null) {
    const error = validarArchivo(imagen);

    if (error) {
      response.status = 400;
      response.body = { success: false, message: error};
      return;
    };
    rutaImagen = generarRutaArchivo(imagen, "usuarios")
    await escribirArchivo(imagen,rutaImagen);
  }
    const resultado = await Proveedor.EditarProveedor(
    idProveedor,
    {nombreProveedor: nombre, apellidoProveedor:apellido, emailProveedor:email, imagen_url:rutaImagen || undefined, idEmpresa: sesion.idEmpresa},
    sesion.idEmpresa
    );

    if (!resultado.success) {
      response.status = 404;
      response.body = resultado;
      return;
    }

    response.status = 200;
    response.body = resultado;

  } catch (error) {
    console.log("error en editar prove: " + error);
    response.status = 500;
    response.body = { success: false, message:"Error interno del servidor"}
  }
};



// PATCH  /api/admin/proveedor/:id/estado
export const cambiarEstadoProveedor = async (ctx: RouterContext<string>) => {
  const { response, state, params, request } = ctx;
  try {
    const sesion = state.user as Sesion;
    const idProveedor = Number(params.id);

    if (!sesion.id || !sesion.idEmpresa) {
      response.status = 401;
      response.body = { success: false, message: "No autenticado" };
      return;
    }

    if (Number.isNaN(idProveedor)) {
        response.status = 400;
        response.body = { success: false, 
            message: "ID Invalido"
        }
        return;
    };
    console.log("ID Proveedor: ", idProveedor);

    const body = await request.body.json();
    if (![0, 1].includes(body.estado)) {
      response.status = 400;
      response.body = { success: false, message: "Estado inválido" };
      return;
    }

    const resultado = await Proveedor.CambiarEstado(
      idProveedor,
      sesion.idEmpresa,
      body.estado,
    );

    response.status = resultado.success ? 200 : 404;
    response.body = resultado;
     
  } catch (error) {
    console.log("Estado prov: " + error);
    response.status = 500;
    response.body = {
      success: false,
      message: "Error interno del servidor"
    };
  }
};