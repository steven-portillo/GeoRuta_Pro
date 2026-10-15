export async function generarFirmaIntegridad(
  reference: string,
  amountInCents: number,
  currency: string = "COP",
): Promise<string> {
  const secret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
  if (!secret) throw new Error("Falta WOMPI_INTEGRITY_SECRET en .env");

  const cadena = `${reference}${amountInCents}${currency}${secret}`;

  const encoded = new TextEncoder().encode(cadena);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getWompiPublicKey(): string {
  const key = Deno.env.get("WOMPI_PUBLIC_KEY");
  if (!key) throw new Error("Falta WOMPI_PUBLIC_KEY en .env");
  return key;
}

export function getWompiPrivateKey(): string {
  const key = Deno.env.get("WOMPI_PRIVATE_KEY");
  if (!key) throw new Error("Falta WOMPI_PRIVATE_KEY en .env");
  return key;
}

export function getWompiEventsSecret(): string {
  const key = Deno.env.get("WOMPI_EVENTS_SECRET");
  if (!key) throw new Error("Falta WOMPI_EVENTS_SECRET en .env");
  return key;
}

export function getWompiBaseUrl(): string {
  return Deno.env.get("WOMPI_BASE_URL") || "https://sandbox.wompi.co/v1";
}