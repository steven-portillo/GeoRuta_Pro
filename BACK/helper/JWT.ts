import { create, getNumericDate, verify} from "../dependencies/dependencias.ts"
import { generarKey } from "./cryptoKey.ts"

const key = Deno.env.get("MY_SECRET_JKEY") || "default_key"

const server = Deno.env.get("SERVER") || "georuta"


export const crear_token = async(usuarioId: string) =>{

     const payLoad ={
        iss: server,
        sub: usuarioId,
        jti: crypto.randomUUID(),
        exp: getNumericDate(60*60),

     }

     const secretKey = await generarKey(key);

     return await create({alg: "HS256", type :" jwt"}, payLoad, secretKey)

}

export const verificarTokeAcceso = async(token: string) =>{
    const secretKey = await generarKey(key);
    try {
        return await verify(token,secretKey);
    } catch (error) {
        console.log("token invalido", error)
        return null;

    }

}