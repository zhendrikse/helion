import {
    DiscreteComplexField3D,
    DiscreteScalarField3D,
    SchrodingerEigenstateSolver3D,
    Simulation,
    Vec3,
    WaveFunctionOrbital3D
} from '../../../src/index.js';

const N = 32;
const spacing = 0.16;
const coupling = 1;
const softening = 0.12;

const potential = new DiscreteScalarField3D({
    nx: N,
    ny: N,
    nz: N
});
const psi = new DiscreteComplexField3D({
    nx: N,
    ny: N,
    nz: N
});

const center = (N - 1) / 2;

for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
            const dx = (x - center) * spacing;
            const dy = (y - center) * spacing;
            const dz = (z - center) * spacing;
            const radius = Math.sqrt(dx * dx + dy * dy + dz * dz + softening * softening);

            potential.setValueAt(x, y, z, -coupling / radius);
        }

const solver = new SchrodingerEigenstateSolver3D({
    potential,
    spacing,
    states: 1,
    iterations: 500,
    dt: 0.002
});

solver.initialize(psi);

const orbital = new WaveFunctionOrbital3D({
    spacing,
    pointSize: 4,
    threshold: 0.01
});

psi.real.set(solver.eigenstateAt(0));
psi.imag.fill(0);

console.log('Hydrogen-like 1s energy:', solver.energies[0]);

const simulation = Simulation
    .with({
        htmlDivId: 'hydrogen1sOrbital',
        viewport: { aspectRatio: '1/1' },
        infoPanel: {
            text: '<strong>⚛️ Hydrogen-like 1s orbital</strong><br/>' +
                'A three-dimensional numerical approximation of the hydrogen ground state. ' +
                'The glowing cloud represents the wavefunction amplitude.'
        },
        headUpDisplay: { enabled: false }
    })
    .bind(psi.alwaysWith(orbital));

simulation.frameSceneOn(orbital, {
    padding: 0.7,
    translationY: 0,
    viewDirection: new Vec3(1, 0.8, 1)
});
