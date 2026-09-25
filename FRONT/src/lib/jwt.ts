import {jwtVerify} from "jose";

const Clave_Secreta = import.meta.env.JWT_SUPER_SICRE;

const getClave = () => new TextEncoder().encode(Clave_Secreta);


export interface DatosToken {
    id: number;
    nombre:string;
    rol: string;
    idEmpresa?: number;
}

export const verificarTokenAstro = async (
    token: string | undefined
): Promise <DatosToken| null> => {
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getClave(), {
            algorithms: ["HS256"],
        });

        const datos = payload as unknown as DatosToken;
        if (!datos.id || !datos.rol) return null;

        return datos;
    } catch {
        return null;
    }
};