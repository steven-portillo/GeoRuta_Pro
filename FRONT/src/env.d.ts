/// <reference types="astro/client" />

import type { DatosToken } from "./lib/jwt";

declare global {
    namespace App {
        interface Locals {
            usuario: DatosToken | null;
        }
    }
}