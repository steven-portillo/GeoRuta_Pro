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
  `POST /api/cliente/pagos/wompi/checkout` con
  `{ "id_direccion": 1, "observaciones": "..." }`. El servidor toma los
  productos, cantidades y precios del carrito autenticado, reserva existencias y
  devuelve el pedido pendiente junto con `publicKey`, `currency`,
  `amountInCents`, `reference`, `signature.integrity` y, si está configurada,
  `redirectUrl`.
- El frontend usa esos valores para iniciar el checkout web de Wompi. No envía
  el monto ni la referencia como datos confiables.
- Wompi notifica los cambios a `POST /api/pagos/wompi/webhook`. El endpoint es
  público para que Wompi pueda acceder, pero verifica el checksum SHA-256 del
  evento con `WOMPI_EVENT_SECRET` antes de procesarlo.
- Un pago aprobado confirma el pago y avanza el pedido a `Aprobado`; el cliente
  recibe el correo de confirmación. Si Wompi informa `DECLINED`, `VOIDED` o
  `ERROR`, el pedido se cancela, se libera la reserva y el cliente recibe el
  aviso de cancelación. Otros estados no finales no modifican el pedido.
- No se permiten cancelaciones locales de pedidos online cuyo pago ya fue
  aprobado, porque la integración no incluye reembolsos. Si una aprobación llega
  cuando el pedido ya fue cancelado por otra operación, se registra un error
  para revisión manual.
- Un checkout abandonado que no llegue a generar un estado final de Wompi deja
  el pedido pendiente y el inventario reservado. Aún no hay expiración
  automática; se debe definir e implementar un tiempo límite o cancelación
  coordinada desde el frontend.

## Webhook local con ngrok

Con el backend escuchando en el puerto 8005 y ngrok instalado/iniciado sesión,
abre otra consola y ejecuta:

```powershell
ngrok http 8005
```

Ngrok mostrará una URL HTTPS temporal. Configura en el panel de Wompi la URL
completa de eventos:

```text
https://<dominio-asignado-por-ngrok>/api/pagos/wompi/webhook
```

La URL gratuita puede cambiar al reiniciar ngrok; actualízala en Wompi si
cambia. En producción se configura la URL HTTPS pública del backend y no se usa
ngrok.
