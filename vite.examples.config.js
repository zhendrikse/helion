import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: "/helion/",
    build: {
        outDir: 'dist/examples',  // waar de gebundelde scripts komen
        rollupOptions: {
            input: {
                charged_ring: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_ring.js'),
                charged_rod: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_rod.js'),
                charged_sheet: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_sheet.js'),
                dipole_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/dipole_field.js'),
                electromagnetic_wave_quiver: path.resolve(__dirname, 'examples/electromagnetism/scenes/electromagnetic_wave_quiver.js'),
                n_body_oscillator: path.resolve(__dirname, 'examples/waves/scenes/n_body_oscillator.js'),
                solenoid: path.resolve(__dirname, 'examples/electromagnetism/scenes/solenoid.js'),
                star_cluster: path.resolve(__dirname, 'examples/astrophysics/scenes/star_cluster.js')
            },
            output: {
                entryFileNames: '[name].js',
                format: 'esm'
            }
        }
    },
    resolve: {
        alias: {
            helion: path.resolve(__dirname, 'src')
        }
    }
});
