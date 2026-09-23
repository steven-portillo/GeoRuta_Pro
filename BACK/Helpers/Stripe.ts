const STRIPE_API_BASE = "https://api.stripe.com/v1";

function obtenerClaveSecreta(): string {
  const clave = Deno.env.get("STRIPE_SECRET_KEY");
  if (!clave) throw new Error("STRIPE_SECRET_KEY no esta configurada");
  return clave;
}

// crea un PaymentIntent llamando directo a la REST API de Stripe (sin SDK)
export async function crearPaymentIntent(
  montoCentavos: number,
  idPedido: number,
): Promise<{ id: string; clientSecret: string }> {
  const params = new URLSearchParams();
  params.set("amount", String(montoCentavos));
  params.set("currency", "usd");
  params.set("automatic_payment_methods[enabled]", "true");
  params.set("metadata[id_pedido]", String(idPedido));

  const respuesta = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${obtenerClaveSecreta()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(data?.error?.message ?? "Error al crear el PaymentIntent en Stripe");
  }

  return { id: data.id, clientSecret: data.client_secret };
}

// consulta el estado real del PaymentIntent — nunca se confia en lo que dice el navegador del cliente
export async function obtenerPaymentIntent(id: string): Promise<{ status: string; id: string }> {
  const respuesta = await fetch(`${STRIPE_API_BASE}/payment_intents/${id}`, {
    headers: { Authorization: `Bearer ${obtenerClaveSecreta()}` },
  });

  const data = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(data?.error?.message ?? "Error al consultar el PaymentIntent en Stripe");
  }

  return { status: data.status, id: data.id };
}

// verifica la firma del webhook a mano (reemplaza a EventUtility.ConstructEvent del SDK oficial).
// el header Stripe-Signature trae "t=<timestamp>,v1=<firma_hex>"; la firma esperada es
// HMAC-SHA256("<timestamp>.<payload_crudo>", webhookSecret) codificada en hex
export async function verificarFirmaWebhook(
  payloadCrudo: string,
  headerFirma: string,
  secreto: string,
  toleranciaSegundos = 300,
): Promise<boolean> {
  const partes = Object.fromEntries(
    headerFirma.split(",").map((par) => par.split("=") as [string, string]),
  );
  const timestamp = partes["t"];
  const firmaRecibida = partes["v1"];
  if (!timestamp || !firmaRecibida) return false;

  // rechaza timestamps muy viejos, para prevenir ataques de repeticion (replay)
  const ahora = Math.floor(Date.now() / 1000);
  if (Math.abs(ahora - Number(timestamp)) > toleranciaSegundos) return false;

  const mensaje = `${timestamp}.${payloadCrudo}`;
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(mensaje));
  const firmaHex = Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return firmaHex === firmaRecibida;
}