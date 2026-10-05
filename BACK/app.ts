import {Application, oakCors} from "./dependencies/dependencias.ts";
import { authRouter } from "./router/authRouter.ts";
import { productoRouter } from "./router/productoRouter.ts";
import { stripeRouter } from "./router/stripeRouter.ts";

const app = new Application();

app.use(oakCors());

const routes = [stripeRouter, productoRouter, authRouter];

routes.forEach( router => {
    app.use(router.routes());
    app.use(router.allowedMethods());
});

console.log("Corriendo en el puerto 8001");

app.listen({ port: 8001 });