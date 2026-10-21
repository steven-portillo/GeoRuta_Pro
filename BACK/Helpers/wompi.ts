function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredWompiSetting(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Falta ${name} en el entorno`);
  }
  return value;
}

function getRequiredWompiSettingFromAliases(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  throw new Error(`Falta ${names.join(" o ")} en el entorno`);
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

export function getWompiPublicKey(): string {
  return getRequiredWompiSetting("WOMPI_PUBLIC_KEY");
}

export function validarConfiguracionCheckoutWompi(): void {
  getRequiredWompiSetting("WOMPI_INTEGRITY_SECRET");
}

export function getWompiRedirectUrl(): string | undefined {
  return Deno.env.get("WOMPI_REDIRECT_URL")?.trim() || undefined;
}

export async function generarFirmaIntegridad(
  reference: string,
  amountInCents: number,
  currency = "COP",
): Promise<string> {
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new Error(
      "El valor del pago en centavos debe ser un entero positivo",
    );
  }
  const secret = getRequiredWompiSetting("WOMPI_INTEGRITY_SECRET");
  return await sha256Hex(`${reference}${amountInCents}${currency}${secret}`);
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

  const secret = getRequiredWompiSettingFromAliases(
    "WOMPI_EVENT_SECRET",
    "WOMPI_EVENTS_SECRET",
  );
  const expected = await sha256Hex(
    `${values.join("")}${timestamp}${secret}`,
  );
  return equalHex(checksum, expected);
}
