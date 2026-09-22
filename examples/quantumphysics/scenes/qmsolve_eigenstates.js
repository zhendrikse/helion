import {
    Checkbox, DiscreteComplexField, Hamiltonian, Range, Simulation, SingleParticle,
    Slider, Vec3, WaveFunctionSurface3D
} from '../../../src/index.js';

const N = 120;
const extent = 0.15 * (N - 1);
const springConstant = 0.05;

/**
 * 2D isotropic harmonic oscillator:
 * V(x, y) = 0.5 * k * (x^2 + y^2)
 */
const harmonicOscillator = (/** @type {SingleParticle} */ particle) =>
    0.5 * springConstant * (particle.x ** 2 + particle.y ** 2);

const H = new Hamiltonian({
    particle: SingleParticle,
    potential: harmonicOscillator,
    spatialNdim: 2,
    N,
    extent
});

const {states, energies} = H.solve({
    maxStates: 10,
    iterations: 900,
    dt: 0.01
});

const psi = new DiscreteComplexField({ nx: N, ny: N });
const waveFunction = new WaveFunctionSurface3D({
    zScale: 3,
    brightness: 1.5
});

let currentIndex = 8;
function showState(index = 8) {
    currentIndex = index;
    psi.real.set(states[index]);
    psi.imag.fill(0);
}
showState();

let staticView = false;
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
    .runsEvery(0.02)
    .onStep((clock, dt) => {
        if (staticView)
            return;

        const E = energies[currentIndex];
        const state = states[currentIndex];
        for (let i = 0; i < psi.real.length; i++) {
            psi.real[i] =  state[i] * Math.cos(E * clock.simulatedTime);
            psi.imag[i] = -state[i] * Math.sin(E * clock.simulatedTime);
        }
    })
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, states.length - 1, 1))
        .withValue(8)
        // @ts-ignore
        .addEventListener('input', event => showState(Number(event.target.value)))
    )
    .append(new Checkbox("Static")
        // @ts-ignore
        .onChange(event => staticView = event.target.checked)
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
simulation.start();
