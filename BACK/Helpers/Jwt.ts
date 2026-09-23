import {
  create,
  getNumericDate,
  verify,
} from "../Dependencies/dependencias.ts";
import { generarKey } from "./CriptoKey.ts";

const key = Deno.env.get("MY_SECRET_KEY");
const server = Deno.env.get("SERVER") || "http://localhost:8005";

if (!key) {
  throw new Error("MY_SECRET_KEY no está definida. Revisa tu archivo .env");
}

interface TokenPayload {
  id: number;
  rol: string;
}

export const crearToken = async ({ id, rol }: TokenPayload) => {
  const payload = {
    iss: server,
    sub: String(id),
    rol,
    jti: crypto.randomUUID(),
    exp: getNumericDate(60 * 60 * 8), // 8 horas
  };

  const secretKey = await generarKey(key);

  return await create({ alg: "HS256", typ: "JWT" }, payload, secretKey);
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