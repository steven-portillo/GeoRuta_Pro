# Autenticación con Google y recuperación de contraseña

## Cambios de base de datos

Para una base ya existente, ejecuta `auth_google_password_migration.sql` una
sola vez. Permite usuarios sin contraseña local (cuentas de Google), almacena el
identificador de Google y amplía la tabla de recuperación para guardar hashes
de tokens de un solo uso. Las instalaciones nuevas pueden usar `georuta.sql`.

## Inicio y registro con Google

- En Google Cloud configura el cliente OAuth para la aplicación web y sus
  orígenes autorizados.
- Añade `GOOGLE_CLIENT_ID` al entorno backend y configura el mismo client ID en
  el frontend para obtener una credencial (ID token).
- Envía `{ "credential": "<ID_TOKEN>" }` a `POST /api/auth/google`.
- El servidor valida firma RS256 con las claves públicas de Google, emisor,
  audiencia, expiración y email verificado. Google no comparte ni almacena la
  contraseña del usuario.
- Un cliente nuevo se crea con `password_hash = NULL` y `google_sub` único.
  Una cuenta de cliente existente con el mismo email verificado queda vinculada
  a Google; el hash local existente se conserva. Google no crea ni autentica
  cuentas ADMIN, PROVEEDOR o SUPERADMIN.
- Una persona que se registró con Google puede añadir una contraseña local
  desde su perfil, autenticada y usando la operación común de cambio de
  contraseña sin contraseña actual cuando todavía no tiene una.

## Recuperar contraseña (todos los roles)

- `POST /api/auth/forgot-password` acepta `{ "email": "..." }` y devuelve
  siempre el mismo mensaje genérico para evitar revelar si existe la cuenta.
- Para cuentas activas se manda un token aleatorio de un solo uso, con
  vencimiento de 15 minutos. Solo se guarda su SHA-256; se limitan las
  solicitudes a tres por cuenta por minuto.
- `POST /api/auth/reset-password` acepta
  `{ "token": "<token>", "password": "<nueva contraseña>" }`, hashea la nueva
  contraseña con el mismo bcrypt que usa el login y consume todos los tokens
  pendientes de esa cuenta.
- `PASSWORD_RESET_URL` es opcional y apunta a la pantalla del frontend que
  recibirá el token por query string. Sin ella, el correo incluye el código para
  introducirlo manualmente.
- El cambio de contraseña invalida enlaces de recuperación existentes. Los
  JWT de sesiones activas no se revocan; vencen según su expiración habitual.
