# Integración Wompi

## Configuración

1. Aplica `wompi_migration.sql` a la base de datos `georuta` antes de desplegar
   este cambio. El esquema base `georuta.sql` ya incluye estas columnas para
   instalaciones nuevas.
2. Configura estas variables en el `.env` del backend usando las credenciales
   del ambiente de pruebas de Wompi:
   - `WOMPI_PUBLIC_KEY`
   - `WOMPI_INTEGRITY_SECRET`
   - `WOMPI_EVENT_SECRET` (también se acepta `WOMPI_EVENTS_SECRET` por
     compatibilidad)
   - `WOMPI_REDIRECT_URL` (opcional; URL del frontend a la que Wompi redirige al
     finalizar)
3. No compartas ni publiques los secretos de integridad y de eventos.
   `WOMPI_SECRET_KEY` y `WOMPI_BASE_URL` no se usan en este flujo: el frontend
   inicia el checkout web de Wompi y el backend recibe su evento firmado. No
   pongas la llave privada en el frontend.

## Flujo

- Con sesión de cliente, el frontend envía
  `POST /api/cliente/pagos/wompi/checkout` o `POST /api/cliente/pago/crear-intencion`.
  El servidor devuelve el pedido pendiente junto con `publicKey`, `currency`,
  `amountInCents`, `reference`, `signature` y `redirectUrl`.
- El frontend usa esos valores para iniciar el checkout web de Wompi. No envía
  el monto ni la referencia como datos confiables.
- Wompi notifica los cambios a `POST /api/pagos/wompi/webhook`. El endpoint es
  público para que Wompi pueda acceder, pero verifica el checksum SHA-256 del
  evento con `WOMPI_EVENT_SECRET` antes de procesarlo.
- Un pago aprobado confirma el pago y avanza el pedido a `Aprobado`; el cliente
  recibe el correo de confirmación. Si Wompi informa `DECLINED`, `VOIDED` o
  `ERROR`, el pedido se cancela y el cliente recibe el aviso de cancelación.

