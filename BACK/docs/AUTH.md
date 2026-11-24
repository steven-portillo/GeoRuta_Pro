   # Autenticación con Google y recuperación de contraseña

## Inicio y registro con Google

- En Google Cloud configura el cliente OAuth para la aplicación web y sus orígenes autorizados.
- Añade `GOOGLE_CLIENT_ID` al entorno backend y configura el mismo client ID en el frontend para obtener una credencial (ID token).
- Envía `{ "credential": "<ID_TOKEN>" }` a `POST /api/auth/google`.
- El servidor valida el token y autentica o registra la cuenta de cliente.

## Recuperar contraseña (3 pasos)

- `POST /api/auth/password-recovery/request` acepta `{ "email": "..." }` y envía un código de 6 dígitos con expiración de 10 minutos.
- `POST /api/auth/password-recovery/verify` valida el código de 6 dígitos.
- `POST /api/auth/password-recovery/reset` actualiza la contraseña del usuario.

