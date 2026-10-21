// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    output:'server',
  vite: {
    server: {
      allowedHosts: [
        'venture-particle-allowance-viruses.trycloudflare.com'
      ]
    }
  },
  adapter: node({
    mode: 'standalone'
  })
});