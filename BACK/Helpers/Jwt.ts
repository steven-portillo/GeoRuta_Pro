import {
  create,
  getNumericDate,
  verify,
} from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";
import type { Payload } from "../Dependencies/dependencias.ts";

const key = Deno.env.get("MY_SECRET_KEY");
const server = Deno.env.get("SERVER") || "http://localhost:8005";

if (!key) {
  throw new Error("MY_SECRET_KEY no está definida. Revisa tu archivo .env");
}


export interface DatosToken extends Payload{
    id:number;
    rol:string;
    nombre: string;
    idEmpresa: number | null;
}

export const crearToken = async (datos:DatosToken): Promise<string> =>{
    const clave = await generarKey(key);
  
    return await create(
        {alg: "HS256", typ:"JWT"},
        {
            iss: server,
            sub: String(datos.id), 
            ...datos,
            jti: crypto.randomUUID(),
            exp: getNumericDate(60*60*8),
        },
        clave,
    );
};

export const VerificarTokenAcceso = async (token: string) => {
  const secretKey = await generarKey(key);

  try {
    return await verify(token, secretKey);
  } catch (error) {
    console.error("Token inválido: ", error);
    return null;
  }
};