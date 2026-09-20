import {
    DiscreteComplexField, DiscreteScalarField, Range, SchrodingerEigenstateSolver, Simulation,
    Slider, Transformation, Vec3, WaveFunctionSurface3D
} from '../../../src/index.js';

const N = 100;
const spacing = 0.15;
const springConstant = 0.05;

/**
 * 2D isotropic harmonic oscillator:
 * V(x, y) = 0.5 * k * (x^2 + y^2)
 */
class IsotropicHarmonicOscillator extends Transformation {
    /** @param {DiscreteScalarField} field */
    applyTo(field) {
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const px = (x - (N - 1) / 2) * spacing;
                const py = (y - (N - 1) / 2) * spacing;
                field.setValueAt(x, y, 0.5 * springConstant * (px * px + py * py));
            }
    }
}

const potential = new DiscreteScalarField({ nx: N, ny: N });
const psi = new DiscreteComplexField({ nx: N, ny: N });
const solver = new SchrodingerEigenstateSolver({
    potential,
    spacing,
    states: 10,
    iterations: 900
});
potential.apply(new IsotropicHarmonicOscillator());
solver.initialize(psi, 0.01);

const waveFunction = new WaveFunctionSurface3D({
    zScale: 3,
    brightness: 1.5
});

function showState(index = 8) {
    psi.real.set(solver.eigenstateAt(index));
    psi.imag.fill(0);
}
showState();

const simulation = Simulation
    .with({
        htmlDivId: 'qmsolveEigenstates',
        viewport: { aspectRatio: '4/3' },
        infoPanel: {
            text: '<strong>🫐 Stationary eigenstates</strong><br/>Stationary ' +
                'eigenstates of a 2D isotropic harmonic oscillator:' +
                '$$\nV(x,y)=\\frac{1}{2}k(x^2+y^2)\n$$' +
                'Each state reveals a characteristic pattern of amplitude ' +
                'and phase, forming the familiar wave-like lobes of quantum mechanics.\n'
        },
        headUpDisplay: { enabled: false }
    })
    .bind(psi.alwaysWith(waveFunction))
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, solver.stateCount - 1, 1))
        .withValue(8)
        .addEventListener('input', event => showState(Number(event.target.value)))
    )
    .append(new Slider('📐 Height scale')
        .withRange(new Range(1, 10, .1))
        .withValue(waveFunction.zScale)
        .on(waveFunction)
        .withProperty('zScale')
    );

simulation.frameSceneOn(waveFunction, {
    padding: 0.5,
    translationY: 0,
    viewDirection: new Vec3(-1, 0.8, 0.9)
});
