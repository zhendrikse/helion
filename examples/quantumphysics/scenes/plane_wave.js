import {
    Simulation, OneDimensionalComplexPlaneWave, Vec3, Slider, Range, WaveFunction
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

const arrowView = new OneDimensionalComplexPlaneWave({ amplitude: 20 });
arrowView.position.set(-.5 * 100, 0, 0);

//
// View for 2D canvas
//
// const htmlDiv2d = document.getElementById('planeWaveContainer2d');
// const renderer2d = Canvas2DRenderer.in(htmlDiv2d);
// const waveView2d = new OneDimensionalComplexPlaneWave2D({
//     scaleY: 10,
//     width: htmlDiv2d.clientWidth,
//     height: htmlDiv2d.clientHeight
// });

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
            text: '<strong>Complex plane wave Ψ</strong><br/>' +
                'Each arrow represents the complex value of the wave function at a fixed position $x$.<br/>' +
                'The arrow rotates in the complex plane as time evolves:<br/>' +
                '- <b>z-direction</b>: $Re(\\psi)$<br/>' +
                '- <b>y-direction</b>: $Im(\\psi)$<br/>' +
                '- <b>color</b>: $\\text{phase}(\\psi)$<br/>' +
                'The <b>arrow length is constant</b>, as $|\\psi|$ does not depend on $t$'
        }
    })
    // .synchronize(planeWave.alwaysWith(waveView2d))
    .bind(planeWave.alwaysWith(arrowView))
    .runsEvery(0.02)
    .onStep((clock, _) => planeWave.time = clock.simulatedTime)
    .append(new Slider('Amplitude: ')
        .on(arrowView)
        .withProperty('amplitude')
        .withValue(20)
        .withRange(new Range(0.5, 25, .1)))
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

// const startStopButton = new Button(htmlDiv2d)
//     .withText('Stop')
//     .addEventListener('click', (event) => {
//         if (simulation.isRunning)
//             simulation.stop();
//         else
//             simulation.start();
//
//         event.target.innerText = event.target.innerText === 'Pause' ? 'Resume' : 'Pause';
//     })
//
// RadioButton.togetherWith(startStopButton)
//     .on(waveView2d)
//     .withProperty('mode')
//     .withLabel('Real/imag ')
//     .withValue('realImag')
//     .checked(true);
//
// RadioButton.togetherWith(startStopButton)
//     .on(waveView2d)
//     .withProperty('mode')
//     .withLabel('Density/phase ')
//     .withValue('densityPhase');




