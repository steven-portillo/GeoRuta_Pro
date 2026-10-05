import {Stripe, load} from "../dependencies/dependencias.ts";

const env = await load();

const key = env.STRIPE_SECRET_KEY;
if(!key) throw new Error("No se ha definido la clave secreta de Stripe en el archivo .env");

export const stripe = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
});