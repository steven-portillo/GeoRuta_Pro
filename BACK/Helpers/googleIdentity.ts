interface GoogleJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

interface GoogleIdentity {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

interface GoogleKeySet {
  keys: GoogleJwk[];
}

let cachedKeys: GoogleJwk[] = [];
let keysExpireAt = 0;

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseJwtPart(value: string): Record<string, unknown> | null {
  try {
    const result: unknown = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(value)),
    );
    if (
      typeof result !== "object" || result === null || Array.isArray(result)
    ) {
      return null;
    }
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function googleSigningKeys(
  fetcher: typeof fetch,
  forceRefresh = false,
): Promise<GoogleJwk[]> {
  if (!forceRefresh && Date.now() < keysExpireAt && cachedKeys.length > 0) {
    return cachedKeys;
  }

  const response = await fetcher("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) {
    throw new Error(`No se pudieron obtener las claves públicas de Google`);
  }
  const data: unknown = await response.json();
  if (
    typeof data !== "object" || data === null ||
    !Array.isArray((data as GoogleKeySet).keys)
  ) {
    throw new Error("Google respondió un conjunto de claves inválido");
  }

  const keys = (data as GoogleKeySet).keys.filter((key) =>
    key.kid && key.kty === "RSA" && (!key.alg || key.alg === "RS256") &&
    (!key.use || key.use === "sig")
  );
  if (keys.length === 0) {
    throw new Error("Google no devolvió claves de firma compatibles");
  }

  const maxAge = response.headers.get("Cache-Control")?.match(/max-age=(\d+)/i);
  const ttlMs = maxAge ? Number(maxAge[1]) * 1000 : 5 * 60 * 1000;
  cachedKeys = keys;
  keysExpireAt = Date.now() + ttlMs;
  return keys;
}

export async function verificarGoogleIdToken(
  idToken: string,
  clientId: string,
  fetcher: typeof fetch = fetch,
): Promise<GoogleIdentity | null> {
  const parts = idToken.split(".");
  if (
    parts.length !== 3 ||
    parts.some((part) => part.length === 0) ||
    idToken.length > 10_000
  ) {
    return null;
  }

  const header = parseJwtPart(parts[0]);
  const claims = parseJwtPart(parts[1]);
  if (
    !header || !claims || header.alg !== "RS256" ||
    typeof header.kid !== "string"
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== "https://accounts.google.com" &&
    claims.iss !== "accounts.google.com"
  ) {
    return null;
  }
  if (
    !audiences.includes(clientId) ||
    (audiences.length > 1 && claims.azp !== clientId) ||
    typeof claims.exp !== "number" || claims.exp <= now ||
    typeof claims.iat !== "number" || claims.iat > now + 60 ||
    (typeof claims.nbf === "number" && claims.nbf > now + 60) ||
    typeof claims.sub !== "string" || claims.sub.length === 0 ||
    claims.sub.length > 255 ||
    typeof claims.email !== "string" ||
    typeof claims.email_verified !== "boolean" ||
    !claims.email_verified
  ) {
    return null;
  }

  let signingKey = (await googleSigningKeys(fetcher)).find((key) =>
    key.kid === header.kid
  );
  if (!signingKey) {
    signingKey = (await googleSigningKeys(fetcher, true)).find((key) =>
      key.kid === header.kid
    );
  }
  if (!signingKey) return null;

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    signingKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = decodeBase64Url(parts[2]);
  const signatureBuffer = new ArrayBuffer(signatureBytes.length);
  new Uint8Array(signatureBuffer).set(signatureBytes);
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signatureBuffer,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!signatureValid) return null;

  const email = claims.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    return null;
  }

  const fullName = typeof claims.name === "string" ? claims.name.trim() : "";
  const givenName = typeof claims.given_name === "string"
    ? claims.given_name.trim()
    : fullName.split(/\s+/)[0] ?? "";
  const familyName = typeof claims.family_name === "string"
    ? claims.family_name.trim()
    : fullName.split(/\s+/).slice(1).join(" ");
  const apellido = familyName || "Usuario";
  if (
    !givenName || givenName.length > 100 || apellido.length > 100
  ) {
    return null;
  }

  return {
    sub: claims.sub,
    email,
    given_name: givenName,
    family_name: apellido,
    ...(typeof claims.picture === "string" &&
        claims.picture.startsWith("https://")
      ? { picture: claims.picture.slice(0, 255) }
      : {}),
  };
}
