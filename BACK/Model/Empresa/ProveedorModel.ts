import { conexion } from "../conexion.ts";
import { hash } from "../../Dependencies/dependencias.ts";

interface ProveedorData {
    nombreProveedor: string;
    apellidoProveedor: string;
    emailProveedor: string;
    passwordProveedor: string;
    idEmpresa: number;
}

export class Proveedor {
    public _ObjProveedor: ProveedorData | null;   
    constructor( ObjProveedor: ProveedorData | null = null) {
        this._ObjProveedor = ObjProveedor;
    }

    static async ListarProveedores(idEmpresa:number) {
        return await conexion.query(
            `select 
            u.id_usuario, e.id_empresa, concat(u.nombre," ", u.apellido) as nombre_proveedor,
            u.email, u.imagen_url, u.activo
            from usuarios u
            inner join empresas e on u.id_empresa = e.id_empresa and u.id_rol = 3
            where u.id_empresa = ? 
            `,
            [idEmpresa],
        );
    }

    public async CrearProveedor():Promise< 
    | { success: true; message: string}
    | { success: false; message: string}> {
        try {
            const p = this._ObjProveedor;
            if (!p) {
                return { success:false,
                    message: "No se recibieron datos para crear un Repartidor",
                };
            }

            const [existeEmail] = await conexion.query(
                `select id_usuario from usuarios where email = ?`,
                [p.emailProveedor],
            );

            if(existeEmail) {
                return { success: false,
                    message: "El correo electronico ya esta registrado",
                };
            }

            const passwordHasheado = await hash(p.passwordProveedor);

            const result = await conexion.execute(
                `insert into usuarios
                (id_empresa, id_rol, nombre, apellido, email, password_hash, imagen_url, activo, fecha_creacion)
                values (?,3,?,?,?,?,NULL,1, CURRENT_TIMESTAMP)`,
                [p.idEmpresa,p.nombreProveedor, p.apellidoProveedor, p.emailProveedor, passwordHasheado],
            );

            return { success: true,
                message: "Repartidor creado correctamente",
            };

        } catch (error) {
            console.log("Error en el metodo CrearProveedr: " + error);
            return { success: false,
                message: "Error al crear el repartidor"
            };
        }
    }
}


