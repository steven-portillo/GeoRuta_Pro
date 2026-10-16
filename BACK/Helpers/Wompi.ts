// helpers/wompi.ts
// integracion con wompi (web checkout) usando fetch directo, sin sdk

const URL_API = Deno.env.get("WOMPI_API_URL") ?? "https://sandbox.wompi.co/v1";
const URL_CHECKOUT = "https://checkout.wompi.co/p/";
const MONEDA = "COP";

export interface TransaccionWompi {
  id: string;
  status: string; // APPROVED, DECLINED, VOIDED, ERROR, PENDING
  reference: string;
  amount_in_cents: number;
}

// forma del evento que wompi envia al webhook
export interface EventoWompi {
  event: string;
  data: Record<string, unknown>;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

// lee una variable de entorno obligatoria y falla con un mensaje claro si falta
function leerVariable(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error(`${nombre} no esta configurada`);
  return valor;
}

// sha-256 de un texto, devuelto en hexadecimal
async function sha256Hex(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// wompi no acepta reutilizar una referencia: cada intento de pago lleva una nueva
export function generarReferencia(idPedido: number): string {
  return `GR-${idPedido}-${Date.now()}`;
}

// de "GR-12-1760000000000" saca el id del pedido (12); devuelve 0 si no cumple el formato
export function idPedidoDeReferencia(referencia: string): number {
  const coincidencia = /^GR-(\d+)-\d+$/.exec(referencia);
  return coincidencia ? Number(coincidencia[1]) : 0;
}

// wompi trabaja en centavos: $18.500 cop -> 1850000
export function pesosACentavos(totalCop: number): number {
  return Math.round(totalCop * 100);
}

// arma la url a la que se redirige al cliente para pagar en la pagina de wompi.
// la firma de integridad es sha256(referencia + monto + moneda + secreto)
export async function construirUrlCheckout(
  referencia: string,
  montoCentavos: number,
  urlRetorno: string,
): Promise<string> {
  const secretoIntegridad = leerVariable("WOMPI_INTEGRITY_SECRET");
  const firma = await sha256Hex(`${referencia}${montoCentavos}${MONEDA}${secretoIntegridad}`);

  const parametros: [string, string][] = [
    ["public-key", leerVariable("WOMPI_PUBLIC_KEY")],
    ["currency", MONEDA],
    ["amount-in-cents", String(montoCentavos)],
    ["reference", referencia],
    ["signature:integrity", firma],
    ["redirect-url", urlRetorno],
  ];

  // el nombre del parametro va tal cual (signature:integrity); solo el valor se codifica
  const consulta = parametros
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`)
    .join("&");

  return `${URL_CHECKOUT}?${consulta}`;
}


// consulta una transaccion por su id (el que wompi agrega como ?id= al volver al comercio).
// esta consulta es publica en wompi: no necesita llave. devuelve null si el id no existe
export async function obtenerTransaccionPorId(
  idTransaccion: string,
): Promise<TransaccionWompi | null> {
  const respuesta = await fetch(`${URL_API}/transactions/${encodeURIComponent(idTransaccion)}`);
  if (respuesta.status === 404) return null;

  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(cuerpo?.error?.reason ?? "Error al consultar la transaccion en Wompi");
  }

  return (cuerpo?.data ?? null) as TransaccionWompi | null;
}
// verifica el checksum del webhook. wompi indica en signature.properties que campos
// (rutas dentro de data, ej. "transaction.id") se concatenan, y despues se agregan
// el timestamp y el secreto de eventos antes de aplicar sha256
export async function verificarChecksumEvento(evento: EventoWompi): Promise<boolean> {
  const checksumRecibido = evento?.signature?.checksum;
  const propiedades = evento?.signature?.properties;
  const timestamp = evento?.timestamp;

  if (!checksumRecibido || !Array.isArray(propiedades) || timestamp === undefined) return false;

  const valores = propiedades.map((ruta) => {
    const valor = ruta
      .split(".")
      .reduce<unknown>((actual, clave) => (actual as Record<string, unknown> | undefined)?.[clave], evento.data);
    return valor === undefined || valor === null ? "" : String(valor);
  });

  const cadena = valores.join("") + String(timestamp) + leerVariable("WOMPI_EVENTS_SECRET");
  const calculado = await sha256Hex(cadena);

  return calculado.toUpperCase() === String(checksumRecibido).toUpperCase();
}