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
                black_hole_ray_tracer: path.resolve(__dirname, 'examples/astrophysics/scenes/black_hole_ray_tracer.js'),
                black_hole_space_time: path.resolve(__dirname, 'examples/relativity/scenes/black_hole_space_time.js'),
                bouncing_ball_on_floor: path.resolve(__dirname, 'examples/kinematics/scenes/bouncing_ball_on_floor.js'),
                bouncing_ball_on_spring: path.resolve(__dirname, 'examples/kinematics/scenes/bouncing_ball_on_spring.js'),
                carbon_dioxide: path.resolve(__dirname, 'examples/molecularphysics/scenes/carbon_dioxide.js'),
                chain_drop: path.resolve(__dirname, 'examples/kinematics/scenes/chain_drop.js'),
                chaos_fractals: path.resolve(__dirname, 'examples/mathematics/scenes/chaos_fractals.js'),
                charged_ring: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_ring.js'),
                charged_rod: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_rod.js'),
                charged_sheet: path.resolve(__dirname, 'examples/electromagnetism/scenes/charged_sheet.js'),
                complex_surfaces: path.resolve(__dirname, 'examples/mathematics/scenes/complex_surfaces.js'),
                coral_2d: path.resolve(__dirname, 'examples/nature/scenes/coral_2d.js'),
                cubic_lattice: path.resolve(__dirname, 'examples/molecularphysics/scenes/cubic_lattice.js'),
                dipole_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/dipole_field.js'),
                div_curl: path.resolve(__dirname, 'examples/mathematics/scenes/div_curl.js'),
                double_slit: path.resolve(__dirname, 'examples/quantumphysics/scenes/double_slit.js'),
                quantum_wave_scattering: path.resolve(__dirname, 'examples/quantumphysics/scenes/quantum_wave_scattering.js'),
                earth: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/earth.js'),
                electromagnetic_wave_quiver: path.resolve(__dirname, 'examples/electromagnetism/scenes/electromagnetic_wave_quiver.js'),
                energy_equipartition: path.resolve(__dirname, 'examples/thermodynamics/scenes/energy_equipartition.js'),
                fire: path.resolve(__dirname, 'examples/nature/scenes/fire.js'),
                floating_block: path.resolve(__dirname, 'examples/kinematics/scenes/floating_block.js'),
                flocking_birds: path.resolve(__dirname, 'examples/nature/scenes/flocking_birds.js'),
                fractal_terrain: path.resolve(__dirname, 'examples/nature/scenes/fractal_terrain.js'),
                fractals: path.resolve(__dirname, 'examples/mathematics/scenes/fractals.js'),
                fourier_transform: path.resolve(__dirname, 'examples/mathematics/scenes/fourier_transform.js'),
                fourier_transform_2d: path.resolve(__dirname, 'examples/mathematics/scenes/fourier_transform_2d.js'),
                faradays_law: path.resolve(__dirname, 'examples/electromagnetism/scenes/faradays_law.js'),
                fraunhofer_diffraction: path.resolve(__dirname, 'examples/waves/scenes/fraunhofer_diffraction.js'),
                game_of_life: path.resolve(__dirname, 'examples/games/scenes/game_of_life.js'),
                harmonograph: path.resolve(__dirname, 'examples/mathematics/scenes/harmonograph.js'),
                lorenz_attractor: path.resolve(__dirname, 'examples/mathematics/scenes/lorenz_attractor.js'),
                matrix_transformation: path.resolve(__dirname, 'examples/mathematics/scenes/matrix_transformation.js'),
                menger_sponge: path.resolve(__dirname, 'examples/mathematics/scenes/menger_sponge.js'),
                moving_charge: path.resolve(__dirname, 'examples/electromagnetism/scenes/moving_charge.js'),
                n_body_oscillator: path.resolve(__dirname, 'examples/waves/scenes/n_body_oscillator.js'),
                parametric_surfaces: path.resolve(__dirname, 'examples/mathematics/scenes/parametric_surfaces.js'),
                pendulum_wave: path.resolve(__dirname, 'examples/waves/scenes/pendulum_wave.js'),
                plane_wave: path.resolve(__dirname, 'examples/quantumphysics/scenes/plane_wave.js'),
                polar_coordinates_integration: path.resolve(__dirname, 'examples/mathematics/scenes/polar_coordinates_integration.js'),
                proton_helical_motion: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_helical_motion.js'),
                proton_in_magnetic_field: path.resolve(__dirname, 'examples/electromagnetism/scenes/proton_in_magnetic_field.js'),
                pythagoras: path.resolve(__dirname, 'examples/mathematics/scenes/pythagoras.js'),
                raindrops: path.resolve(__dirname, 'examples/nature/scenes/raindrops.js'),
                real_surfaces: path.resolve(__dirname, 'examples/mathematics/scenes/real_surfaces.js'),
                roots_of_unity: path.resolve(__dirname, 'examples/mathematics/scenes/roots_of_unity.js'),
                rossler_attractor: path.resolve(__dirname, 'examples/mathematics/scenes/rossler_attractor.js'),
                rubiks_cube: path.resolve(__dirname, 'examples/games/scenes/rubiks_cube.js'),
                rutherford_scattering: path.resolve(__dirname, 'examples/molecularphysics/scenes/rutherford_scattering.js'),
                saturn: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/saturn.js'),
                slinky_drop: path.resolve(__dirname, 'examples/kinematics/scenes/slinky_drop.js'),
                solenoid: path.resolve(__dirname, 'examples/electromagnetism/scenes/solenoid.js'),
                schwarzschild_space_time: path.resolve(__dirname, 'examples/relativity/scenes/schwarzschild_space_time.js'),
                spaghettification: path.resolve(__dirname, 'examples/relativity/scenes/spaghettification.js'),
                shells: path.resolve(__dirname, 'examples/nature/scenes/shells.js'),
                sierpinski: path.resolve(__dirname, 'examples/mathematics/scenes/sierpinski.js'),
                spectral_theorem: path.resolve(__dirname, 'examples/mathematics/scenes/spectral_theorem.js'),
                spiral_galaxy: path.resolve(__dirname, 'examples/astrophysics/scenes/spiral_galaxy.js'),
                star_cluster: path.resolve(__dirname, 'examples/astrophysics/scenes/star_cluster.js'),
                sun: path.resolve(__dirname, 'examples/astrophysics/scenes/planets/sun.js'),
                suspended_spring: path.resolve(__dirname, 'examples/waves/scenes/suspended_spring.js'),
                taylor_expansion: path.resolve(__dirname, 'examples/mathematics/scenes/taylor_expansion.js'),
                three_body: path.resolve(__dirname, 'examples/kinematics/scenes/three_body.js'),
                travelling_wave: path.resolve(__dirname, 'examples/waves/scenes/travelling_wave.js'),
                two_dim_infinite_square_well: path.resolve(__dirname, 'examples/quantumphysics/scenes/two_dim_infinite_square_well.js'),
                vector_fields: path.resolve(__dirname, 'examples/mathematics/scenes/vector_fields.js'),
                vibrating_membrane: path.resolve(__dirname, 'examples/waves/scenes/vibrating_membrane.js'),
                water_molecule: path.resolve(__dirname, 'examples/molecularphysics/scenes/water_molecule.js'),
                water_sprinkler: path.resolve(__dirname, 'examples/nature/scenes/water_sprinkler.js'),
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
