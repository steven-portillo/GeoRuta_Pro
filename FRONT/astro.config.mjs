// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  // modo servidor: obligatorio para poder usar cookies httpOnly y rutas api/*
  // que reenvian el token al backend deno (patron bff/ssr)
  output: 'server',
  adapter: node({
    // 'standalone' crea un servidor node independiente al hacer build,
    // ideal para desarrollo y para desplegar sin depender de otro framework
    mode: 'standalone',
  }),

  // escucha en 0.0.0.0 en vez de solo localhost, para que ngrok (u otra
  // maquina en la red) pueda alcanzar el servidor de desarrollo
  server: { host: true },

  vite: {
    server: {
      // Vite bloquea por defecto cualquier Host header que no reconozca
      // (proteccion contra DNS rebinding) — sin esto, ngrok da
      // "Blocked request. This host is not allowed".
      // ngrok reparte dominios random bajo distintos sufijos segun la
      // cuenta/plan (.ngrok-free.app, .ngrok-free.dev, .ngrok.io), asi que
      // se cubren todos en vez de solo uno
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io'],
    },
  },
});
