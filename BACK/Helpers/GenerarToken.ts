import { crearJWT, getNumericDate } from "../Dependencies/Dependencias.ts";

// genera la clave criptografica a partir del secreto configurado en .env
// exportada porque tanto VerificarAutenticacion.ts como RastreoController.ts
// necesitan la misma clave para verificar la firma del jwt
export async function obtenerClaveJWT(): Promise<CryptoKey> {
  const secreto = Deno.env.get("JWT_SECRET");
  if (!secreto) throw new Error("JWT_SECRET no esta configurada");

  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// crea un jwt firmado con hs256; incluye idEmpresa ademas de rol porque georuta es multi-tenant
export async function GenerarToken(
  idUsuario: number,
  rol: string,
  idEmpresa: number | null,
): Promise<string> {
  const clave = await obtenerClaveJWT();
  const horasExpiracion = Number(Deno.env.get("JWT_EXPIRACION_HORAS") ?? 8);

  return await crearJWT(
    { alg: "HS256", typ: "JWT" },
    {
      sub: String(idUsuario),
      iss: Deno.env.get("JWT_ISSUER") ?? "georuta",
      jti: crypto.randomUUID(),
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60 * horasExpiracion),
      rol,
      idEmpresa,
    },
    clave,
  );
}