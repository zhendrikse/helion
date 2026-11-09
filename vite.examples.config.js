import { defineConfig } from 'vite';
import path from 'node:path';
import fg from 'fast-glob';

const examplesDir = path.resolve(import.meta.dirname, 'examples');

async function getExamples() {
    console.time('[examples] Discovery');

    const files = await fg('**/scenes/*.js', {
        cwd: examplesDir,
        onlyFiles: true,
        absolute: true,
        followSymbolicLinks: false,
        ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**'
        ]
    });

    console.timeEnd('[examples] Discovery');
    console.log(`[examples] Found ${files.length} demos.`);

    return Object.fromEntries(
        files.map(file => {
            const relativePath = path.relative(
                examplesDir,
                file
            );

            const name = relativePath
                .replace(/\.js$/, '')
                .replaceAll(path.sep, '_');

            return [name, file];
        })
    );
}

export default defineConfig(async () => {
    const input = await getExamples();

    return {
        base: '/helion/',
        build: {
            outDir: 'docs/public',
            emptyOutDir: false,
            rollupOptions: {
                input
            }
        }
    };
});

