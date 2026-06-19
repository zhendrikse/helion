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
                coral_2d: path.resolve(__dirname, 'examples/nature/scenes/coral_2d.js'),
                dipole_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/dipole_field.js'),
                double_slit: path.resolve(__dirname, 'examples/quantumphysics/scenes/double_slit.js'),
                quantum_wave_scattering_2d: path.resolve(__dirname, 'examples/quantumphysics/scenes/quantum_wave_scattering_2d.js'),
                quantum_wave_scattering_3d: path.resolve(__dirname, 'examples/quantumphysics/scenes/quantum_wave_scattering_3d.js'),
                earth: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/earth.js'),
                electromagnetic_wave_quiver: path.resolve(__dirname, 'examples/electromagnetism/scenes/electromagnetic_wave_quiver.js'),
                floating_block: path.resolve(__dirname, 'examples/kinematics/scenes/floating_block.js'),
                flocking_birds: path.resolve(__dirname, 'examples/nature/scenes/flocking_birds.js'),
                fractal_terrain: path.resolve(__dirname, 'examples/nature/scenes/fractal_terrain.js'),
                fourier_transform: path.resolve(__dirname, 'examples/mathematics/scenes/fourier_transform.js'),
                faradays_law: path.resolve(__dirname, 'examples/electromagnetism/scenes/faradays_law.js'),
                fraunhofer_diffraction: path.resolve(__dirname, 'examples/waves/scenes/fraunhofer_diffraction.js'),
                proton_helical_motion: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_helical_motion.js'),
                n_body_oscillator: path.resolve(__dirname, 'examples/waves/scenes/n_body_oscillator.js'),
                moving_charge: path.resolve(__dirname, 'examples/electromagnetism/scenes/moving_charge.js'),
                parametric_surfaces: path.resolve(__dirname, 'examples/mathematics/scenes/parametric_surfaces.js'),
                plane_wave: path.resolve(__dirname, 'examples/quantumphysics/scenes/plane_wave.js'),
                proton_in_magnetic_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_in_magnetic_field.js'),
                raindrops: path.resolve(__dirname, 'examples/nature/scenes/raindrops.js'),
                real_surfaces: path.resolve(__dirname, 'examples/mathematics/scenes/real_surfaces.js'),
                saturn: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/saturn.js'),
                solenoid: path.resolve(__dirname, 'examples/electromagnetism/scenes/solenoid.js'),
                schwarzschild_space_time: path.resolve(__dirname, 'examples/relativity/scenes/schwarzschild_space_time.js'),
                shells: path.resolve(__dirname, 'examples/nature/scenes/shells.js'),
                spiral_galaxy: path.resolve(__dirname, 'examples/astrophysics/scenes/spiral_galaxy.js'),
                star_cluster: path.resolve(__dirname, 'examples/astrophysics/scenes/star_cluster.js'),
                sun: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/sun.js'),
                three_body: path.resolve(__dirname, 'examples/kinematics/scenes/three_body.js'),
                vibrating_membrane: path.resolve(__dirname, 'examples/waves/scenes/vibrating_membrane.js'),
                wave_scattering: path.resolve(__dirname, 'examples/waves/scenes/wave_scattering.js')
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
