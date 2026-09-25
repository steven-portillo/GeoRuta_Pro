import { Context, RouterContext } from "../../Dependencies/dependencias.ts";
import { Proveedor } from "../../Model/Empresa/ProveedorModel.ts";
import type { Sesion } from "../../Utils/tipos.ts";


//GET /api/empresa/proveedores
export const listarProveedores = async (ctx:Context) => {
    const {state, response} = ctx
    try {
        const sesion = state.user as Sesion;
        if (!sesion.id) {
            response.status = 401;
            response.body = { success: false,
                message: "No autenticado"
            }
            return;
        }

        const proveedores = await Proveedor.ListarProveedores(sesion.idEmpresa!);

        response.status = 200;
        response.body = { success: true, data: proveedores};
    } catch (error) {
        console.log("Error en el controller lista proveedor: " + error);
        response.status = 500;
        response.body = { success: false,
            message: "Error interno del servidor al listar repartidores"
        }
    }
}


//POST  /api/empresa/crear-proveedor
export const crearProveedor = async (ctx:Context) => {
    const { request, response, state } = ctx
    try {
        const body = await request.body.json();
        
        const sesion = state.user as Sesion;
        if (!sesion.id) {
            response.status = 401;
            response.body = { success: false,
                message: "No autenticado"
            }
            return;
        }
        const idEmpresa = sesion.idEmpresa;
        const nombre = body.nombre ?? body.nombres;
        const apellido = body.apellido ?? body.apellidos;
        const {email, password} = body;

        if (!nombre || !apellido || !email || !password || !idEmpresa) {
            response.status = 400;
            response.body = { success: false,
                message: "Faltan campos obligatorios: nombre, apellido, email, password."
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

        const objProveedor = new Proveedor({
            nombreProveedor: nombre,
            apellidoProveedor: apellido,
            emailProveedor: email,
            passwordProveedor: password,
            idEmpresa: idEmpresa
        })


        const result = await objProveedor.CrearProveedor();

        if(result.success){
            response.status = 201;
            response.body = { success: true, message: result.message};
        }else {
            response.status = 400;
            response.body = { success: false, message: result.message};
        }
    } catch (error) {
        console.log("Error en el controller de crear proveedor: " + error);
        response.status = 500;
        response.body = { success: false, message: "Error interno del servidor" };
    }
}