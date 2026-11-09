import { defineConfig } from 'vite';
import path from 'node:path';
import fg from 'fast-glob';

const examplesDir = path.resolve(import.meta.dirname, 'examples');

export default defineConfig(async () => {
    const files = await fg('**/scenes/**/*.js', {
        cwd: examplesDir,
        onlyFiles: true,
        absolute: true,
        followSymbolicLinks: false
    });

    const input = Object.fromEntries(
        files.map(file => {
            const relativePath = path.relative(
                examplesDir,
                file
            ).split(path.sep).join('/');

            return [`examples/${relativePath}`, file];
        })
    );

    console.log('[examples] Inputs:', Object.keys(input).length);

    return {
        base: '/helion/',

        build: {
            outDir: 'docs/public',
            emptyOutDir: false,

            rollupOptions: {
                input,
                output: {
                    entryFileNames: '[name]',
                    chunkFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash][extname]'
                }
            }
        }
    };
});