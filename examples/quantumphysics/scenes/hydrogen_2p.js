import {
    DiscreteComplexField3D, DiscreteScalarField3D, SchrodingerEigenstateSolver3D, Simulation, Transformation, Vec3,
    WaveFunctionOrbital3D
} from '../../../src/index.js';

const N = 64;
const spacing = 0.16;
const stateIndex = 1; // 2p_x; 2p_y and 2p_z are states 2 and 3.

class HydrogenPotential extends Transformation {
    constructor({
        coupling = 1,
        softening = 0.12,
    } = {}) {
        super();
        this._softening = softening;
        this._coupling = coupling;
    }

    applyTo(field) {
        const center = (N - 1) / 2;

        for (let z = 0; z < N; z++)
            for (let y = 0; y < N; y++)
                for (let x = 0; x < N; x++) {
                    const dx = (x - center) * spacing;
                    const dy = (y - center) * spacing;
                    const dz = (z - center) * spacing;
                    const radius = Math.sqrt(
                        dx * dx + dy * dy + dz * dz + this._softening * this._softening
                    );

                    field.setValueAt(x, y, z, -this._coupling / radius);
                }
    }
}

const potential = new DiscreteScalarField3D({ nx: N, ny: N, nz: N });
const psi = new DiscreteComplexField3D({ nx: N, ny: N, nz: N });
potential.apply(new HydrogenPotential());

const solver = new SchrodingerEigenstateSolver3D({
    potential,
    spacing,
    states: 4,
    iterations: 700
});

solver.initialize(psi, 0.002);

const orbital = new WaveFunctionOrbital3D({
    spacing,
    pointSize: 4,
    threshold: 0.01
});

psi.real.set(solver.eigenstateAt(stateIndex));
psi.imag.fill(0);

for (let index = 0; index < solver.stateCount; index++)
    console.log(`Hydrogen-like state ${index} energy:`, solver.energies[index]);

console.log(`2p_x residual:`, solver.diagnosticsFor(stateIndex).residual);

const simulation = Simulation
    .with({
        htmlDivId: 'hydrogen2pOrbital',
        viewport: { aspectRatio: '1/1' },
        infoPanel: {
            text: '<strong>⚛️ Hydrogen-like 2p orbitals</strong><br/>' +
                'The first excited manifold contains three degenerate orbitals. ' +
                'This view shows the 2pₓ orbital; the 2pᵧ and 2p_z states are generated alongside it.'
        },
        headUpDisplay: { enabled: false }
    })
    .bind(psi.alwaysWith(orbital));

simulation.frameSceneOn(orbital, {
    padding: 0.7,
    translationY: 0,
    viewDirection: new Vec3(1, 0.8, 1)
});
