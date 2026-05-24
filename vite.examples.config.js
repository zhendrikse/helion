import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: '/helion/',
    build: {
        outDir: 'docs/public',
        emptyOutDir: false,
        rollupOptions: {
            input: {
                antenna: path.resolve(__dirname, 'examples/electromagnetism/scenes/antenna.js'),
                bouncing_ball_on_floor: path.resolve(__dirname, 'examples/kinematics/scenes/bouncing_ball_on_floor.js'),
                bouncing_ball_on_spring: path.resolve(__dirname, 'examples/kinematics/scenes/bouncing_ball_on_spring.js'),
                charged_ring: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_ring.js'),
                charged_rod: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_rod.js'),
                charged_sheet: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_sheet.js'),
                dipole_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/dipole_field.js'),
                electromagnetic_wave_quiver: path.resolve(__dirname, 'examples/electromagnetism/scenes/electromagnetic_wave_quiver.js'),
                floating_block: path.resolve(__dirname, 'examples/kinematics/scenes/floating_block.js'),
                flocking_birds: path.resolve(__dirname, 'examples/nature/scenes/flocking_birds.js'),
                faradays_law: path.resolve(__dirname, 'examples/electromagnetism/scenes/faradays_law.js'),
                proton_helical_motion: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_helical_motion.js'),
                n_body_oscillator: path.resolve(__dirname, 'examples/waves/scenes/n_body_oscillator.js'),
                moving_charge: path.resolve(__dirname, 'examples/electromagnetism/scenes/moving_charge.js'),
                proton_in_magnetic_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_in_magnetic_field.js'),
                plane_wave: path.resolve(__dirname, 'examples/quantumphysics/scenes/plane_wave.js'),
                solenoid: path.resolve(__dirname, 'examples/electromagnetism/scenes/solenoid.js'),
                three_body: path.resolve(__dirname, 'examples/kinematics/scenes/three_body.js'),
                star_cluster: path.resolve(__dirname, 'examples/astrophysics/scenes/star_cluster.js'),
                vibrating_membrane: path.resolve(__dirname, 'examples/waves/scenes/vibrating_membrane.js')
            },
            output: {
                entryFileNames: 'examples/[name].js',
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
