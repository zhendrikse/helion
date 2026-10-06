import {
    Simulation, OneDimensionalWaveFunctionView, Vec3, Slider, Range, WaveFunction
} from '../../../src/index.js';

//
// Physics model
//
const lambda = 15 * Math.PI;
const planeWave = new WaveFunction({ nx: 100 });

let k = -2 * Math.PI / lambda;
let omega = -Math.PI;
function updateEigenstate() {
    planeWave.reset();
    const eigenstateReal = new Float64Array(planeWave.nx);
    const eigenstateImag = new Float64Array(planeWave.nx);
    for (let x = 0; x < planeWave.nx; x++) {
        eigenstateReal[x] = Math.cos(k * x);   
        eigenstateImag[x] = Math.sin(k * x);
    }
    planeWave.addEigenstate(eigenstateReal, eigenstateImag, omega);
    planeWave.collapseToEigenstate(0);
}
updateEigenstate();

const waveView = new OneDimensionalWaveFunctionView({
    amplitude: 25,
    // arrowDistance: dx,
    arrowSize: 0.75,
    arrowOffsetX: -0.5 * 100,
    mode: OneDimensionalWaveFunctionView.Mode.ARROWS
});

//
// View for 3D canvas
//
Simulation
    .with({
        htmlDivId: 'planeWaveContainer3d',
        camera: {
            position: new Vec3(0, 0, 300),
            fieldOfView: 20
        },
        headUpDisplay: { enabled: false },
        viewport: { aspectRatio: '2/1', parameterMenuCollapsed: false },
        infoPanel: {
            text: '<strong>Complex plane wave $\\Psi$</strong><br/>' +
                'Each arrow represents the complex value of the wave function at a fixed position $x$.<br/>' +
                'The arrow rotates in the complex plane as time evolves:<br/>' +
                '- <b>z-direction</b>: $Re(\\Psi)$<br/>' +
                '- <b>y-direction</b>: $Im(\\Psi)$<br/>' +
                '- <b>color</b>: $\\text{phase}(\\Psi)$<br/>' +
                'The <b>arrow length is constant</b>, as $\\|\\Psi\\|$ does not depend on $t$'
        }
    })
    // .synchronize(planeWave.alwaysWith(waveView2d))
    .bind(planeWave.alwaysWith(waveView))
    .runsEvery(0.02)
    .onStep((clock, _) => planeWave.time = clock.simulatedTime)
    .append(new Slider('Amplitude: ')
        .on(waveView)
        .withProperty('amplitude')
        .withValue(25)
        .withRange(new Range(0.5, 30, .1)))
    .append(new Slider('Omega: ')
        .withRange(new Range(0, 10, .1))
        .withValue(Math.PI)
        .onInput(event => {
            omega = -Number(/** @type {HTMLInputElement} */ (event.target).value);
            updateEigenstate();
        }))
    .append(new Slider('Wave number: ')
        .withRange(new Range(-.4, .4, .01))
        .withValue(0.1)
        .onInput(event => {
            k = -Number(/** @type {HTMLInputElement} */ (event.target).value);
            updateEigenstate();
        }))
    .start();





