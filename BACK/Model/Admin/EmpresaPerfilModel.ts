import { conexion } from "../conexion.ts";

interface EditarEmpresaData {
  nombre?: string;
  descripcion?: string;
  logo_url?: string;
  color_primario?: string;
}

interface perfilEmpresa {
    color_primario: string;
} 

export class EmpresaModel {
    public _ObjPerfilEmpresa: perfilEmpresa | null;
    constructor(ObjPerfilEmpresa: perfilEmpresa | null = null) {
        this._ObjPerfilEmpresa = ObjPerfilEmpresa;
    }
    //para la paleta de colores
    static async tomarColorEmpresa(idEmpresa: number):Promise<
    | { success: true,
        message: string,
        data: {
            color_primario: string
        }
    }
    | { success: false; message: string}
    >{
        try {
            const [color] = await conexion.query(
            `
            select color_primario from empresas
            where id_empresa = ?
            `,
            [idEmpresa],
        );
        if (!color) {
            return { success: false, message: "Empresa no encontrada"};
        }
        return { success: true,
            message: "El color existe",
            data: {
                color_primario: color.color_primario
            }
        };
        } catch (error) {
            console.log("Error al conseguir el color: " + error);
            return { success: false, message:"Error del servidor"};
        }
    }

    //para el perfil de la empresa
    static async Obtener(id_empresa: number) {
    const [empresa] = await conexion.query(
      `SELECT id_empresa, nombre, descripcion, logo_url, color_primario, color_acento
       FROM empresas WHERE id_empresa = ?`,
      [id_empresa],
    );
    return empresa ?? null;
  }
  //editar datos de la empresa + color de la empresa
  static async Editar(id_empresa: number, datos: EditarEmpresaData) {
    const campos: string[] = [];
    const valores: unknown[] = [];

    if (datos.nombre) {
      campos.push("nombre = ?");
      valores.push(datos.nombre);
    }
    if (datos.descripcion !== undefined) {
      campos.push("descripcion = ?");
      valores.push(datos.descripcion);
    }
    if (datos.logo_url) {
      campos.push("logo_url = ?");
      valores.push(datos.logo_url);
    }
    if (datos.color_primario) {
      campos.push("color_primario = ?");
      valores.push(datos.color_primario);
    }

    if (campos.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }

    valores.push(id_empresa);
    await conexion.execute(
      `UPDATE empresas SET ${campos.join(", ")} WHERE id_empresa = ?`,
      valores,
    );

    return { success: true, message: "Empresa actualizada correctamente" };
  }
}