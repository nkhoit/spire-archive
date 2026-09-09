import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  // Preserve HTML-aware whitespace across the Astro 7 compiler migration.
  compressHTML: true,
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: {
    host: '0.0.0.0',
  },
  vite: {
    plugins: [tailwind()],
  },
});
