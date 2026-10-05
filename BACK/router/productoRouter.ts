import { Router } from "../dependencies/dependencias.ts";
import { getProductos, getStock } from "../controller/productosController.ts";

const productoRouter = new Router();

productoRouter.get("/producto", getProductos)
productoRouter.get("/stock", getStock)

export {productoRouter}