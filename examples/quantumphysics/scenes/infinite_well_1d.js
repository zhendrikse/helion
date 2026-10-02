import {
    Simulation, Vec3, Slider, Range, WaveFunction, OneDimensionalWaveFunctionArrows, RadioGroup, OneDimensionalWaveFunctionPlot
} from '../../../src/index.js';

const L = 20;
const resolution = 80;
const infiniteWell = new WaveFunction({ nx: resolution });
const Lx = L / resolution;

/** @param {WaveFunction} infiniteWell */
function initEigenstates(infiniteWell) {
    for (let n = 1; n <= 4; n++) {
        const real = new Float64Array(resolution);
        const imag = new Float64Array(resolution);
        const k = n * Math.PI / L;
        const energy = n * n * Math.PI * Math.PI / (2 * L * L);
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

initEigenstates(infiniteWell);
infiniteWell.setSuperposition([{ eigenstate: 0, coefficient: WaveFunction.realCoefficient(1) }]);

const arrowView = new OneDimensionalWaveFunctionArrows({
    arrowDistance: Lx,
    size: 0.1,
    amplitude: 20,
});
arrowView.position.set(-.25 * L, 0, 0);

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
            text: '<strong>Particle in an infinite square well</strong><br/>' +
                'The arrows show the complex wave function<br/>' +
                '$\\psi(x)$ = Re$(\\psi)$ + $i\\cdot$Im$(\\psi)$.<br/>' +
                '- <b>z-direction</b>: Re($\\psi$)<br/>' +
                '- <b>y-direction</b>: Im($\\psi$)<br/>' +
                '- <b>color</b>: phase($\\psi$)<br/>' +
                'The arrow length represents $\\|\\psi\\|$. Use the controls to mix eigenstates.'
        }
    })
    .bind(infiniteWell.alwaysWith(arrowView))
    .runsEvery(0.02)
    .advancesBy(.5 *Math.PI)
    .onStep((clock, _) => infiniteWell.time = clock.simulatedTime)
    .append(new RadioGroup()
        .add('Ground state (n=1)', () => 
            infiniteWell.setSuperposition([{ eigenstate: 0, coefficient: WaveFunction.realCoefficient(1) }]))
        .add('1st excited (n=2)', () =>  
            infiniteWell.setSuperposition([{ eigenstate: 1, coefficient: WaveFunction.realCoefficient(1) }]))
        .add('2nd excited (n=3)', () =>  
            infiniteWell.setSuperposition([{ eigenstate: 2, coefficient: WaveFunction.realCoefficient(1) }]))
        .add('3rd excited (n=4)', () =>  
            infiniteWell.setSuperposition([{ eigenstate: 3, coefficient: WaveFunction.realCoefficient(1) }]))
        .checked(0)
    )
    .append(new Slider('n=1 (ground): ')
        .withRange(new Range(0, 1, 0.01))
        .withValue(1)
        .onInput(event => { weights.ground = parseFloat(event.target.value); updateSuperposition(); })
    )
    .append(new Slider('n=2 (1st excited): ')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0)
        .onInput(event => { weights.first = parseFloat(event.target.value); updateSuperposition(); })
    )
    .append(new Slider('n=3 (2nd excited): ')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0)
        .onInput(event => { weights.second = parseFloat(event.target.value); updateSuperposition(); }) 
    )
    .append(new Slider('n=4 (3rd excited): ')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0)
        .onInput(event => { weights.third = parseFloat(event.target.value); updateSuperposition(); })
    )
    .start();