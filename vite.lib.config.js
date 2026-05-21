// vite.lib.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/helion/examples/',
    build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'Helion',
      fileName: (format) => `helion.${format}.js`,
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE'
        }
      }
    }
  }
});