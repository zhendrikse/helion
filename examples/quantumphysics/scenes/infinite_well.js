import {
    Simulation, Vec3, Slider, Range, WaveFunction, OneDimensionalComplexPlaneWave,
    RadioGroup, Checkbox, Button
} from '../../../src/index.js';

const L = 20;
const resolution = 80;
const infiniteWell = new WaveFunction({ nx: resolution, ny: 1 });
const Lx = L / resolution;

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

const arrowView = new OneDimensionalComplexPlaneWave({
    arrowDistance: Lx,
    size: 0.5
});
arrowView.position.set(-L / 2, 0, 0);

const weights = { ground: 1, first: 0, second: 0, third: 0 };
function updateSuperposition() {
    const state = new Float64Array(resolution);
    const energies = infiniteWell.spectrum;
    const w = [weights.ground, weights.first, weights.second, weights.third];
    for (let n = 0; n < 4; n++) {
        if (w[n] === 0) continue;
        const eigenstate = infiniteWell._eigenstates[n];
        for (let i = 0; i < resolution; i++) 
            state[i] += w[n] * eigenstate.real[i];
    }
    infiniteWell.real.set(state);
    infiniteWell.imag.fill(0);
    infiniteWell._energy = w.reduce((sum, w, i) => sum + w * energies[i], 0);
}
updateSuperposition();

Simulation
    .with({
        htmlDivId: 'infiniteWellContainer',
        camera: {
            position: new Vec3(0, 0, 50),
            fieldOfView: 20
        },
        headUpDisplay: { enabled: false },
        viewport: { aspectRatio: '2/1' },
        infoPanel: {
            text: '<strong>Particle in an infinite square well</strong><br/>' +
                'The arrows show the complex wave function Ψ(x) = Re(Ψ) + i·Im(Ψ).<br/>' +
                '- <b>z-direction</b>: Re(Ψ)<br/>' +
                '- <b>y-direction</b>: Im(Ψ)<br/>' +
                '- <b>color</b>: phase(Ψ)<br/>' +
                'The arrow length represents |Ψ|. Use the controls to mix eigenstates.'
        }
    })
    .bind(infiniteWell.alwaysWith(arrowView))
    .runsEvery(0.02)
    .onStep((clock, _) => infiniteWell.time = clock.simulatedTime)
    .append(new RadioGroup()
        .add('Ground state (n=1)', () => { weights.ground = 1; weights.first = weights.second = weights.third = 0; updateSuperposition(); })
        .add('1st excited (n=2)', () => { weights.first = 1; weights.ground = weights.second = weights.third = 0; updateSuperposition(); })
        .add('2nd excited (n=3)', () => { weights.second = 1; weights.ground = weights.first = weights.third = 0; updateSuperposition(); })
        .add('3rd excited (n=4)', () => { weights.third = 1; weights.ground = weights.first = weights.second = 0; updateSuperposition(); })
        .checked(0)
    )
    .append(new Checkbox('Ground state (n=1)')
        .checked(true)
        .onChange(event => { weights.ground = event.target.checked ? 1 : 0; updateSuperposition(); })
        .togetherWith(new Checkbox('1st excited (n=2)')
            .onChange(event => { weights.first = event.target.checked ? 1 : 0; updateSuperposition(); })
            .togetherWith(new Checkbox('2nd excited (n=3)')
                .onChange(event => { weights.second = event.target.checked ? 1 : 0; updateSuperposition(); })
                .togetherWith(new Checkbox('3rd excited (n=4)')
                    .onChange(event => { weights.third = event.target.checked ? 1 : 0; updateSuperposition(); })
                )
            )
        )
    )
    .append(new Slider('Time evolution: ')
        .withRange(new Range(0, 1, 0.01))
        .withValue(0)
        .onChange(event => { infiniteWell.time = event.target.value; })
    )
    .start();