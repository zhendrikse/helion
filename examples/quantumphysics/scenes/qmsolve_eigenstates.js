import {
    Checkbox, DiscreteComplexField, Hamiltonian, Range, Simulation, Colour,
    Slider, Vec3, WaveFunctionSurface3D, HarmonicOscillator, AnisotropicHarmonicOscillator,
    DoubleWell, CircularWell, Quartic, InfiniteSquareWell, UPlotBarGraph, WaveFunction2D
} from '../../../src/index.js';

const N = 110;

const simulation = Simulation
    .with({
        htmlDivId: 'qmsolveEigenstates',
        viewport: { aspectRatio: '19/12' },
        infoPanel: {
            text: '<strong>🫐 Stationary eigenstates</strong><br/>Stationary ' +
                'eigenstates for various potentials.\n\n' +
                'Each state reveals a characteristic pattern of amplitude ' +
                'and phase, forming the familiar wave-like lobes of quantum mechanics.\n'
        },
        parameterMenuCollapsed: false
    });

const hamiltonian = new Hamiltonian({
    potential: HarmonicOscillator.withSpringConstant(0.05),
    progressCallback: (text, percent) => simulation.showHud(text + `: ${Math.round(percent)}%`),
    //potential: AnisotropicHarmonicOscillator.withSpringConstants(.1, .05),
    //potential: DoubleWell.withConstants(100, 100, .1),
    //potential: CircularWell.withRadiusAndBarrier(5, 100),
    //potential: Quartic.withConstant(1e-3),
    //potential: InfiniteSquareWell.withoutParameters(),
    spatialNdim: 2,
    N
});

const psi = new WaveFunction2D(N, 15);
const residuals = await psi.apply(hamiltonian);
// for (const residual of residuals)
//     console.log(residual);

const eigenstate = new DiscreteComplexField({ nx: N, ny: N });
const waveFunction = new WaveFunctionSurface3D({
    zScale: 5,
    brightness: 1.5
});

let currentIndex = 10;
function showState(index = 10) {
    currentIndex = index;
    eigenstate.real.set(psi.eigenstateAt(index).real);
    eigenstate.imag.set(psi.eigenstateAt(index).imag);
    simulation.setLatexTitle(`\\text{Eigenstate ${index + 1} of}\\ ` + HarmonicOscillator.latex)
}
showState();

let staticView = false;
simulation
    .bind(eigenstate.alwaysWith(waveFunction))
    .runsEvery(0.01)
    .onStep((clock, dt) => {
        if (staticView)
            return;

        const E = psi.spectrum[currentIndex];
        const state = psi.eigenstateAt(currentIndex).real;
        for (let i = 0; i < state.length; i++) {
            eigenstate.real[i] =  state[i] * Math.cos(E * clock.simulatedTime);
            eigenstate.imag[i] = -state[i] * Math.sin(E * clock.simulatedTime);
        }
    })
    .append(new Checkbox("Static")
        .checked(staticView)
        // @ts-ignore
        .onChange(event => staticView = event.target.checked)
    )
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, psi.eigenstatesCount - 1, 1))
        .withValue(currentIndex)
        // @ts-ignore
        .addEventListener('input', event => showState(Number(event.target.value)))
    )
    .append(new Slider('📐 Height scale')
        .withRange(new Range(1, 10, .1))
        .withValue(waveFunction.zScale)
        .on(waveFunction)
        .withProperty('zScale')
    )
    .addGraph(new UPlotBarGraph({
        values: psi.spectrum,
        title: 'Eigenstate energies',
        xLabel: 'Eigenstate',
        yLabel: 'Energy',
        labelColor: Colour.Yellow,
        color: new Colour(0.5, 0.5, 1)
    }))
    .frameSceneOn(waveFunction, {
        padding: 0.425,
        viewDirection: new Vec3(-1, .5, 0.9)
    })
    .start();
