import {
    DiscreteComplexField,
    DiscreteScalarField,
    Range,
    SchrodingerEigenstateSolver,
    Simulation,
    Slider,
    Vec3,
    WaveFunctionSurface3D
} from '../../../src/index.js';

const N = 80;
const spacing = 0.15;
const springConstant = 0.05;

const potential = new DiscreteScalarField({ nx: N, ny: N });
const psi = new DiscreteComplexField({ nx: N, ny: N });

for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
        const px = (x - (N - 1) / 2) * spacing;
        const py = (y - (N - 1) / 2) * spacing;
        potential.setValueAt(x, y, 0.5 * springConstant * (px * px + py * py));
    }

const solver = new SchrodingerEigenstateSolver({
    spacing,
    hbar: 1,
    mass: 1,
    iterations: 900,
    dt: 0.01
});

const solution = solver.solve(potential, { states: 6 });

console.log('Schrödinger eigenstate energies:', solution.energies);

const waveFunction = new WaveFunctionSurface3D({
    zScale: 35,
    brightness: 4
});
waveFunction.phaseColor = true;

let stateIndex = 0;

function showState(index) {
    stateIndex = index;
    const state = solution.states[stateIndex];

    psi.real.set(state);
    psi.imag.fill(0);
}

showState(stateIndex);

const simulation = Simulation
    .with({
        htmlDivId: 'qmsolveEigenstates',
        viewport: {
            aspectRatio: '1/1'
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(psi.alwaysWith(waveFunction))
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, solution.states.length - 1, 1))
        .withValue(stateIndex)
        .addEventListener('input', event => showState(Number(event.target.value)))
    )
    .append(new Slider('📐 Height scale')
        .withRange(new Range(5, 60, 1))
        .withValue(waveFunction.zScale)
        .on(waveFunction)
        .withProperty('zScale')
    );

simulation.frameSceneOn(waveFunction, {
    padding: 0.8,
    translationY: 0,
    viewDirection: new Vec3(-1, 0.8, 0.9)
});
