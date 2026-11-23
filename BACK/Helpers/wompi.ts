function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function equalHex(left: string, right: string): boolean {
  if (!/^[\da-f]+$/i.test(left) || !/^[\da-f]+$/i.test(right)) return false;
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.toLowerCase().charCodeAt(index) ^
      right.toLowerCase().charCodeAt(index);
  }
  return difference === 0;
}

/** Genera la firma de integridad para el Widget de Wompi */
export async function generarFirmaIntegridad(
  reference: string,
  amountInCents: number,
  currency: string = "COP",
): Promise<string> {
  const secret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
  if (!secret) throw new Error("Falta WOMPI_INTEGRITY_SECRET en .env");

  // Cadena oficial de Wompi: reference + amountInCents + currency + integrity-secret
  const cadena = `${reference}${amountInCents}${currency}${secret}`;
  return await sha256Hex(cadena);
}

export function getWompiPublicKey(): string {
  const key = Deno.env.get("WOMPI_PUBLIC_KEY");
  if (!key) throw new Error("Falta WOMPI_PUBLIC_KEY en .env");
  return key;
}

export function getWompiPrivateKey(): string {
  const key = Deno.env.get("WOMPI_PRIVATE_KEY") ||
    Deno.env.get("WOMPI_SECRET_KEY");
  if (!key) throw new Error("Falta WOMPI_PRIVATE_KEY en .env");
  return key;
}

export function getWompiEventsSecret(): string {
  const key = Deno.env.get("WOMPI_EVENTS_SECRET") ||
    Deno.env.get("WOMPI_EVENT_SECRET");
  if (!key) throw new Error("Falta WOMPI_EVENTS_SECRET en .env");
  return key;
}

export function getWompiBaseUrl(): string {
  return Deno.env.get("WOMPI_BASE_URL") || "https://sandbox.wompi.co/v1";
}

export async function verificarChecksumEvento(
  event: Record<string, unknown>,
): Promise<boolean> {
  const signature = event.signature;
  const data = event.data;
  if (!isRecord(signature) || !isRecord(data)) return false;

  const checksum = signature.checksum;
  const properties = signature.properties;
  const timestamp = event.timestamp;
  if (
    typeof checksum !== "string" ||
    !Array.isArray(properties) ||
    properties.length === 0 ||
    !(typeof timestamp === "number" || typeof timestamp === "string") ||
    !/^\d+$/.test(String(timestamp))
  ) {
    return false;
  }

  const values: string[] = [];
  for (const property of properties) {
    if (typeof property !== "string" || property.length === 0) return false;
    let value: unknown = data;
    for (const part of property.split(".")) {
      if (!part || !isRecord(value) || !Object.hasOwn(value, part)) {
        return false;
      }
      value = value[part];
    }
    if (
      value === null ||
      !(typeof value === "string" || typeof value === "number" ||
        typeof value === "boolean")
    ) {
      return false;
    }
    values.push(String(value));
  }

  let secret = "";
  try {
    secret = getWompiEventsSecret();
  } catch {
    return false;
  }

  const expected = await sha256Hex(
    `${values.join("")}${timestamp}${secret}`,
  );
  return equalHex(checksum, expected);
}
