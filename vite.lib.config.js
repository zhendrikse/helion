import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
    base: '/helion/',
    build: {
        lib: {
            entry: path.resolve(import.meta.dirname, 'src/index.js'),
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
