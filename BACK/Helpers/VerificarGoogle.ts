import { verificarFirmaJWT } from "../Dependencies/Dependencias.ts";

// datos del token de google que usamos
export interface ClaimsGoogle {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const URL_LLAVES_GOOGLE = "https://www.googleapis.com/oauth2/v3/certs";
const EMISORES_VALIDOS = ["https://accounts.google.com", "accounts.google.com"];
const VIGENCIA_CACHE_MS = 60 * 60 * 1000; // las llaves de google rotan, se guardan 1 hora
const ESPERA_MIN_RECARGA_MS = 60 * 1000; // no se vuelve a pedir la lista mas de 1 vez por minuto

type LlaveGoogle = JsonWebKey & { kid: string };

let cache: { llaves: Map<string, LlaveGoogle>; obtenidas: number } | null = null;

// descarga (o reutiliza) las llaves publicas con las que google firma sus tokens
async function obtenerLlavesGoogle(forzar = false): Promise<Map<string, LlaveGoogle>> {
  const ahora = Date.now();
  if (cache && !forzar && ahora - cache.obtenidas < VIGENCIA_CACHE_MS) return cache.llaves;

  const respuesta = await fetch(URL_LLAVES_GOOGLE);
  if (!respuesta.ok) throw new Error("no se pudieron obtener las llaves publicas de google");

  const { keys } = (await respuesta.json()) as { keys: LlaveGoogle[] };
  cache = { llaves: new Map(keys.map((llave) => [llave.kid, llave])), obtenidas: ahora };
  return cache.llaves;
}

// lee la cabecera del jwt (ahi viene el kid, que dice con cual llave se firmo)
function leerCabecera(token: string): { kid?: string; alg?: string } {
  const base64 = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
}

// verifica un id token de google: firma, vencimiento, emisor, audiencia y correo verificado.
// devuelve los datos del usuario, o null si el token no es valido
export async function verificarTokenGoogle(token: string): Promise<ClaimsGoogle | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID no esta configurada");

  try {
    const { kid, alg } = leerCabecera(token);
    if (alg !== "RS256" || !kid) return null;

    let llaves = await obtenerLlavesGoogle();
    let llave = llaves.get(kid);

    // si el kid no esta, puede que google haya rotado las llaves: se recarga, pero con limite
    if (!llave && cache && Date.now() - cache.obtenidas > ESPERA_MIN_RECARGA_MS) {
      llaves = await obtenerLlavesGoogle(true);
      llave = llaves.get(kid);
    }
    if (!llave) return null;

    const clave = await crypto.subtle.importKey(
      "jwk",
      llave,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // verifica la firma y que no haya vencido (djwt lo revisa solo)
    const claims = (await verificarFirmaJWT(token, clave)) as unknown as ClaimsGoogle;

    if (!EMISORES_VALIDOS.includes(claims.iss)) return null;
    if (claims.aud !== clientId) return null; // el token debe ser para nuestra app
    if (claims.email_verified !== true || !claims.email) return null;

    return claims;
  } catch (error) {
    console.error("token de google invalido:", error);
    return null;
  }
}