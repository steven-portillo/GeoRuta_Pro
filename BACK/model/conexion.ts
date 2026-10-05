import {Client} from "../dependencies/dependencias.ts";

export const conexion = await new Client().connect({
    hostname: "localhost",
    username: "root",
    db: "georuta",
    password: "",
})