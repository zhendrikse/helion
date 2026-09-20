import {
    DiscreteComplexField3D, DiscreteScalarField3D, MathPhysicsModelBehavior, Renderable3D,
    SchrodingerEigenstateSolver3D, Simulation, Transformation, Vec3, WaveFunctionOrbital3D
} from '../../../src/index.js';

const N = 64;
const spacing = 0.16;

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

class Hydrogen2PStates extends MathPhysicsModelBehavior {
    constructor(fields) {
        super();
        this.orbitals = fields;
    }
}

class Hydrogen2PView extends Renderable3D {
    constructor({ spacing = 1 } = {}) {
        super();
        this._orbitals = [
            new WaveFunctionOrbital3D({ spacing, pointSize: 3, threshold: 0.08 }),
            new WaveFunctionOrbital3D({ spacing, pointSize: 3, threshold: 0.08 }),
            new WaveFunctionOrbital3D({ spacing, pointSize: 3, threshold: 0.08 })
        ];

        const offsets = [-12, 0, 12];
        for (let i = 0; i < this._orbitals.length; i++) {
            this._orbitals[i].position.x = offsets[i];
            this.add(this._orbitals[i]);
        }
    }

    canBindTo(model) {
        return model.orbitals?.length === 3;
    }

    initialize(model) {
        for (let i = 0; i < this._orbitals.length; i++)
            this._orbitals[i].initialize(model.orbitals[i]);
    }

    synchronizeWith(model) {
        for (let i = 0; i < this._orbitals.length; i++)
            this._orbitals[i].synchronizeWith(model.orbitals[i]);
    }

    dispose() {
        for (const orbital of this._orbitals)
            orbital.dispose();
    }
}

const potential = new DiscreteScalarField3D({ nx: N, ny: N, nz: N });
potential.apply(new HydrogenPotential());

// Compute the ground state plus the three members of the first excited p-manifold.
const solver = new SchrodingerEigenstateSolver3D({
    potential,
    spacing,
    states: 4,
    iterations: 700
});

const workspace = new DiscreteComplexField3D({ nx: N, ny: N, nz: N });
solver.initialize(workspace, 0.002);

const orbitals = [1, 2, 3].map(stateIndex => {
    const field = new DiscreteComplexField3D({ nx: N, ny: N, nz: N });
    field.real.set(solver.eigenstateAt(stateIndex));
    field.imag.fill(0);
    return field;
});

for (let index = 0; index < solver.stateCount; index++)
    console.log('Hydrogen-like state ' + index + ' energy:', solver.energies[index]);

for (let index = 0; index < orbitals.length; index++) {
    const diagnostics = solver.diagnosticsFor(index + 1);
    console.log('2p_' + 'xyz'[index] + ' residual:', diagnostics.residual);
    console.log('2p_' + 'xyz'[index] + ' inversion parity (expected -1):', diagnostics.inversionParity);
}

const model = new Hydrogen2PStates(orbitals);
const view = new Hydrogen2PView({ spacing });

const simulation = Simulation
    .with({
        htmlDivId: 'hydrogen2pOrbital',
        viewport: { aspectRatio: '12/9' },
        infoPanel: {
            text: '<strong>⚛️ Hydrogen-like 2p orbitals</strong><br/>' +
                'The three members of the first excited p-manifold are shown together: ' +
                '2pₓ, 2pᵧ and 2p_z. Each pair of lobes has opposite phase and a nodal plane through the nucleus.'
        },
        headUpDisplay: { enabled: false }
    })
    .bind(model.alwaysWith(view));

simulation.frameSceneOn(view, {
    padding: 0.5,
    translationY: 0,
    viewDirection: new Vec3(1, 0.8, 1)
});
