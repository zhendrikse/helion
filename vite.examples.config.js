import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        outDir: 'docs/public/examples',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                antenna: path.resolve(__dirname, 'examples/electromagnetism/scenes/antenna.js'),
                charged_ring: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_ring.js'),
                charged_rod: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_rod.js'),
                charged_sheet: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_sheet.js'),
                dipole_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/dipole_field.js'),
                electromagnetic_wave_quiver: path.resolve(__dirname, 'examples/electromagnetism/scenes/electromagnetic_wave_quiver.js'),
                proton_helical_motion: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_helical_motion.js'),
                n_body_oscillator: path.resolve(__dirname, 'examples/waves/scenes/n_body_oscillator.js'),
                moving_charge: path.resolve(__dirname, 'examples/electromagnetism/scenes/moving_charge.js'),
                proton_in_magnetic_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_in_magnetic_field.js'),
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
