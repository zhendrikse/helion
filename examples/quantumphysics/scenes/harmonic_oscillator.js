import {
    Simulation, Vec3, Slider, Range, WaveFunction, OneDimensionalWaveFunctionView, RadioGroup
} from '../../../src/index.js';

const sqrtPi = Math.sqrt(Math.PI);
const L = 12;
const resolution = 80;
const maxStates = 20;
const dx = L / resolution;
const xValues = new Float64Array(resolution);
for (let i = 0; i < resolution; i++) 
    xValues[i] = -L / 2 + i * dx;

const psi = new WaveFunction({ nx: resolution });
const omega = 5;

/**
 * @param {number} maxStates 
 * @returns {Float64Array<ArrayBuffer>[]}
 */
function hermitePolynomials(maxStates) {
    const H = new Array(maxStates);
    for (let n = 0; n < maxStates; n++) 
        H[n] = new Float64Array(resolution);

    H[0].fill(1);
    for (let i = 0; i < resolution; i++) 
        H[1][i] = 2 * xValues[i];

    for (let n = 1; n < maxStates - 1; n++)
        for (let i = 0; i < resolution; i++)
            H[n + 1][i] = 2 * xValues[i] * H[n][i] - 2 * n * H[n - 1][i];

    let normFactor = 1 / sqrtPi ** 0.5;
    for (let i = 0; i < resolution; i++) 
        H[0][i] *= normFactor * Math.exp(-xValues[i] * xValues[i] / 2);

    for (let n = 1; n < maxStates; n++) {
        normFactor /= Math.sqrt(2 * n);
        for (let i = 0; i < resolution; i++)
            H[n][i] *= normFactor * Math.exp(-xValues[i] * xValues[i] / 2);
    }

    return H;
}

const H = hermitePolynomials(maxStates);
for (let n = 0; n < maxStates; n++) {
    const real = H[n];
    const imag = new Float64Array(resolution);
    const energy = (n + 0.5) * omega;
    psi.addEigenstate(real, imag, energy);
}

/** @param {number} alpha */
function setCoherentState(alpha) {
    /** @type {number[]} */
    const weights = [];
    const normFactor = Math.exp(-alpha * alpha / 2);
    let factorial = 1;
    for (let n = 0; n < maxStates; n++) {
        if (n > 0) 
            factorial *= n;
        weights.push(normFactor * Math.pow(alpha, n) / Math.sqrt(factorial));
    }
    const components = weights.map((w, n) => ({ eigenstate: n, coefficient: WaveFunction.realCoefficient(w) }));
    psi.setSuperposition(components);
}
setCoherentState(1.5);

const waveView = new OneDimensionalWaveFunctionView({
    amplitude: 5,
    arrowDistance: dx,
    arrowSize: 0.1,
    arrowOffsetX: -0.25 * L
});

Simulation
    .with({
        htmlDivId: 'harmonicOscillatorContainer',
        camera: {
            position: new Vec3(0, 0, 27.5),
            fieldOfView: 20
        },
        headUpDisplay: { enabled: false },
        viewport: { aspectRatio: '19/12', parameterMenuCollapsed: false },
        infoPanel: {
            text: '<strong>Quantum Harmonic Oscillator</strong><br/>' +
                'Use radio buttons to switch view:<br/>' +
                '- <b><span style=\"color: #ff4444;\">Arrows</span></b>: 3D complex $\\Psi$ (Re=z, Im=y, color=phase)<br/>' +
                '- <b><span style=\"color: #4444ff;\">Density/phase</span></b>: 2D plot (height=$\\|\\Psi\\|^2$, color=phase)<br/>' +
                '- <b><span style=\"color: #ffc000;\">Real</span>/<span style=\"color: #00d0ff;\">Imag</span></b>: 2D plot' + 
                ' (<span style=\"color: #ffc000;\">yellow=Re</span>, <span style=\"color: #00d0ff;\">cyan=Im</span>)<br/>' +
                'Slider adjusts coherent state parameter α.'
        }
    })
    .bind(psi.alwaysWith(waveView))
    .runsEvery(0.03)
    //.advancesBy(0.5 * Math.PI)
    .onStep((clock, _) => psi.time = clock.simulatedTime)
    .append(waveView.ui())
    .append(new Slider('α (coherent state): ')
        .withRange(new Range(0, 3, 0.01))
        .withValue(1.5)
        // @ts-ignore
        .onInput(event => setCoherentState(parseFloat(event.target.value)))
    )
    .start();