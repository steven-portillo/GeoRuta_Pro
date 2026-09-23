export { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

export {
  Application,
  Router,
  Context,
  send
} from "https://deno.land/x/oak@v17.2.0/mod.ts";

export type {
  Next,
  RouterContext,
  RouteParams
} from "https://deno.land/x/oak@v17.2.0/mod.ts";

export { z } from "https://deno.land/x/zod@v3.24.4/mod.ts";

export { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

export { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// djwt: creación y verificación de JSON Web Tokens
export {
  create as crearJWT,
  verify as verificarFirmaJWT,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// bcrypt: hash y verificación de contraseñas
export * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";