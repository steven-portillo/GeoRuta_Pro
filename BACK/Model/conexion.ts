import { Client } from "../Dependencies/dependencias.ts";

const DB_PASS = Deno.env.get("DB_PASS") ?? "";

export const conexion = await new Client().connect({
  hostname: "localhost",
  username: "root",
  db: "georuta",
  password: DB_PASS,
});
