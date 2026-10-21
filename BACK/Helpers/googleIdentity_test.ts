import { verificarGoogleIdToken } from "./googleIdentity.ts";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

Deno.test("Google ID token valida firma, audiencia y correo verificado", async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const kid = "test-google-kid";
  const keySet = {
    ...publicJwk,
    kid,
    alg: "RS256",
    use: "sig",
  };
  const mockFetch: typeof fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ keys: [keySet] }), {
        headers: { "Cache-Control": "public, max-age=300" },
      }),
    );

  const header = base64UrlJson({ alg: "RS256", kid, typ: "JWT" });
  const claims = base64UrlJson({
    iss: "https://accounts.google.com",
    aud: "test-client-id",
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    sub: "google-user-123",
    email: "cliente@example.com",
    email_verified: true,
    given_name: "Ana",
    family_name: "Cliente",
  });
  const signedContent = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(signedContent),
  );
  const token = `${signedContent}.${base64Url(new Uint8Array(signature))}`;

  const identity = await verificarGoogleIdToken(
    token,
    "test-client-id",
    mockFetch,
  );
  if (
    identity?.sub !== "google-user-123" ||
    identity.email !== "cliente@example.com"
  ) {
    throw new Error("Se rechazó el ID token válido de Google");
  }

  if (
    await verificarGoogleIdToken(token, "wrong-client-id", mockFetch) !== null
  ) {
    throw new Error("Se aceptó un ID token con audiencia incorrecta");
  }
});
