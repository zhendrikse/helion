// vite.lib.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: '/helion/',
    build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'Helion',
      formats: ['es'],
      fileName: (format) => `helion.${format}.js`,
    },
    rollupOptions: {
      external: ['three', 'uplot'],
      output: {
        globals: {
          three: 'THREE'
        }
      }
    }
  }
});
