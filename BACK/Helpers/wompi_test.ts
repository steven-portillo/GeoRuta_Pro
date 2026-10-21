import { generarFirmaIntegridad, verificarChecksumEvento } from "./wompi.ts";

Deno.test("Wompi genera la firma de checkout y valida eventos firmados", async () => {
  const previousIntegritySecret = Deno.env.get("WOMPI_INTEGRITY_SECRET");
  const previousEventsSecret = Deno.env.get("WOMPI_EVENT_SECRET");
  Deno.env.set("WOMPI_INTEGRITY_SECRET", "integrity-test-secret");
  Deno.env.set("WOMPI_EVENT_SECRET", "events-test-secret");

  try {
    const reference = "georuta_test_reference";
    const amountInCents = 270000;
    const integritySource =
      `${reference}${amountInCents}COPintegrity-test-secret`;
    const expectedIntegrity = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(integritySource),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (
      await generarFirmaIntegridad(reference, amountInCents) !==
        expectedIntegrity
    ) {
      throw new Error("Firma de integridad de checkout incorrecta");
    }

    const transaction = {
      id: "test-transaction-1",
      status: "APPROVED",
      amount_in_cents: amountInCents,
    };
    const timestamp = 1_797_000_000;
    const eventSecretSource =
      `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}events-test-secret`;
    const checksum = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(eventSecretSource),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const event: Record<string, unknown> = {
      event: "transaction.updated",
      timestamp,
      data: { transaction },
      signature: {
        properties: [
          "transaction.id",
          "transaction.status",
          "transaction.amount_in_cents",
        ],
        checksum,
      },
    };

    if (!await verificarChecksumEvento(event)) {
      throw new Error("Se rechazó un checksum válido de evento");
    }
    transaction.amount_in_cents++;
    if (await verificarChecksumEvento(event)) {
      throw new Error("Se aceptó un evento cuyo contenido fue modificado");
    }
  } finally {
    if (previousIntegritySecret === undefined) {
      Deno.env.delete("WOMPI_INTEGRITY_SECRET");
    } else {
      Deno.env.set("WOMPI_INTEGRITY_SECRET", previousIntegritySecret);
    }
    if (previousEventsSecret === undefined) {
      Deno.env.delete("WOMPI_EVENT_SECRET");
    } else {
      Deno.env.set("WOMPI_EVENT_SECRET", previousEventsSecret);
    }
  }
});
