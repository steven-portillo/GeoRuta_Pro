import { conexion } from "../conexion.ts";


interface perfilEmpresa {
    color_primario: string;
} 

export class EmpresaModel {
    public _ObjPerfilEmpresa: perfilEmpresa | null;
    constructor(ObjPerfilEmpresa: perfilEmpresa | null = null) {
        this._ObjPerfilEmpresa = ObjPerfilEmpresa;
    }
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


    static async actualizarColorEmpresa(
    idEmpresa: number,
    colorPrimario: string
    ): Promise <
        | { success: true; message: string }
        | { success: false; message: string }
    > {
    try {
        const resultado = await conexion.execute(
        `update empresas set color_primario = ? where id_empresa = ?`,
        [colorPrimario, idEmpresa],
        );

        if (!resultado.affectedRows) {
            return { success: false, message: "Empresa no encontrada" };
        }

        return { success: true, message: "Color actualizado correctamente" };
    } catch (error) {
        console.log("Error al actualizar el color: " + error);
        return { success: false, message: "Error del servidor" };
    }
    }
}