import {
    Simulation, Vec3, Slider, Range, WaveFunction, OneDimensionalWaveFunctionArrows, RadioGroup, OneDimensionalWaveFunctionPlot
} from '../../../src/index.js';

const PI = Math.PI;
const L = 20;
const resolution = 80;
const infiniteWell = new WaveFunction({ nx: resolution });
const Lx = L / resolution;

/** @param {WaveFunction} infiniteWell */
function initEigenstates(infiniteWell) {
    for (let eigenstate = 1; eigenstate <= 4; eigenstate++) {
        const real = new Float64Array(resolution);
        const imag = new Float64Array(resolution);
        const k = eigenstate * PI / L;
        const energy = eigenstate * eigenstate * PI * PI / (2 * L * L);
        for (let i = 0; i < resolution; i++) {
            const x = i * Lx;
            real[i] = Math.sqrt(2 / L) * Math.sin(k * x);
            imag[i] = 0;
        }
        infiniteWell.addEigenstate(real, imag, energy);
    }
}

const weights = {ground: 1, first: 0, second: 0, third: 0}
function updateSuperposition() {
    infiniteWell.setSuperposition([
        {eigenstate: 0, coefficient: WaveFunction.realCoefficient(weights.ground) },
        {eigenstate: 1, coefficient: WaveFunction.realCoefficient(weights.first) },
        {eigenstate: 2, coefficient: WaveFunction.realCoefficient(weights.second) },
        {eigenstate: 3, coefficient: WaveFunction.realCoefficient(weights.third) }
    ])
}

const arrowView = new OneDimensionalWaveFunctionArrows({
    arrowDistance: Lx,
    size: 0.1,
    amplitude: 20,
});

const plotView = new OneDimensionalWaveFunctionPlot({ densityScale: 50 }); 

const groundStateSlider = new Slider('n=1: ')
        .withRange(new Range(0, 1, 0.01))
        // @ts-ignore
        .onInput(event => { weights.ground = parseFloat(event.target.value); updateSuperposition(); });
const firstExcitedSlider = new Slider('n=2: ')
        .withRange(new Range(0, 1, 0.01))
        // @ts-ignore
        .onInput(event => { weights.first = parseFloat(event.target.value); updateSuperposition(); });
const secondExcitedSlider = new Slider('n=3: ')
        .withRange(new Range(0, 1, 0.01))
        // @ts-ignore
        .onInput(event => { weights.second = parseFloat(event.target.value); updateSuperposition(); });
const thirdExcitedSlider = new Slider('n=4: ')
        .withRange(new Range(0, 1, 0.01))
        // @ts-ignore
        .onInput(event => { weights.third = parseFloat(event.target.value); updateSuperposition(); });

/** @param {number} n */
function setEigenstate(n) {
    weights.ground = n === 0 ? 1 : 0;
    weights.first = n === 1 ? 1 : 0;
    weights.second = n === 2 ? 1 : 0;
    weights.third = n === 3 ? 1 : 0;
    updateSuperposition();

    groundStateSlider.withValue(n === 0 ? 1 : 0);
    firstExcitedSlider.withValue(n === 1 ? 1 : 0);
    secondExcitedSlider.withValue(n === 2 ? 1 : 0);
    thirdExcitedSlider.withValue(n === 3 ? 1 : 0); 
}

initEigenstates(infiniteWell);
infiniteWell.setSuperposition([{ eigenstate: 0, coefficient: WaveFunction.realCoefficient(1) }]);
setEigenstate(0);
arrowView.position.set(-.25 * L, 0, 0);
plotView.visible = false;

Simulation
    .with({
        htmlDivId: 'infiniteWellContainer',
        camera: {
            position: new Vec3(0, 0, 50),
            fieldOfView: 20
        },
        headUpDisplay: { enabled: false },
        viewport: { aspectRatio: '19/12', parameterMenuCollapsed: false },
        infoPanel: {
            text: '<strong>📦 Particle in a box</strong><br/>' +
                'Use radio buttons to switch view:<br/>' +
                '- <b><span style=\"color: #ff4444;\">Arrows</span></b>: 3D complex $\\Psi$ (Re=z, Im=y, color=phase)<br/>' +
                '- <b><span style=\"color: #4444ff;\">Density/phase</span></b>: 2D plot (height=$\\|\\Psi\\|^2$, color=phase)<br/>' +
                '- <b><span style=\"color: #ffc000;\">Real</span>/<span style=\"color: #00d0ff;\">Imag</span></b>: 2D plot' + 
                ' (<span style=\"color: #ffc000;\">yellow=Re</span>, <span style=\"color: #00d0ff;\">cyan=Im</span>)<br/>' +
                'Use sliders to mix eigenstates.'
        }
    })
    .bind(infiniteWell.alwaysWith(arrowView))
    .bind(infiniteWell.alwaysWith(plotView))
    .runsEvery(0.02)
    .advancesBy(.5 *PI)
    .onStep((clock, _) => infiniteWell.time = clock.simulatedTime)
    .append(new RadioGroup()
        .add('Arrows', () => {
            arrowView.visible = true;
            plotView.visible = false;
        })
        .add('Density/phase', () => {
            arrowView.visible = false;
            plotView.visible = true;
            plotView.mode = OneDimensionalWaveFunctionPlot.Mode.DENSITY_PHASE;
        })
        .add('Real/imag', () => {
            arrowView.visible = false;
            plotView.visible = true;
            plotView.mode = OneDimensionalWaveFunctionPlot.Mode.REAL_IMAG;
        })
        .checked(0)
    )
    .append(new RadioGroup("Eigenstates:")
        .add('n=1', () => setEigenstate(0))
        .add('n=2', () => setEigenstate(1)) 
        .add('n=3', () => setEigenstate(2))
        .add('n=4', () => setEigenstate(3))
        .checked(0)
    )
    .append(groundStateSlider)
    .append(firstExcitedSlider)
    .append(secondExcitedSlider)
    .append(thirdExcitedSlider)
    .start();
