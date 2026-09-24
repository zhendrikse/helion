import {
    Checkbox, DiscreteComplexField, Hamiltonian, Range, Simulation, SingleParticle,
    Slider, Vec3, WaveFunctionSurface3D, HarmonicOscillator, AnisotropicHarmonicOscillator, 
    DoubleWell, CircularWell, Quartic, InfiniteSquareWell, UPlotBarGraph,
    Colour
} from '../../../src/index.js';

const N = 110;
const extent = 0.15 * (N - 1);

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

const H = new Hamiltonian({
    particle: SingleParticle,
    potential: HarmonicOscillator.withSpringConstant(0.05),
    //potential: AnisotropicHarmonicOscillator.withSpringConstants(.1, .05),
    //potential: DoubleWell.withConstants(100, 100, .1),
    //potential: CircularWell.withRadiusAndBarrier(5, 100),
    //potential: Quartic.withConstant(1e-3),
    //potential: InfiniteSquareWell.withoutParameters(),
    spatialNdim: 2,
    N,
    extent
});

const { states, energies, residuals } = await H.solveAsync({
    maxStates: 15,
    iterations: 800,
    calculateResiduals: true,
    progressReportCallback: (text, percent) => simulation.showHud(text + `: ${Math.round(percent)}%`)
});

for (const residual of residuals)
    console.log(residual);

const psi = new DiscreteComplexField({ nx: N, ny: N });
const waveFunction = new WaveFunctionSurface3D({
    zScale: 5,
    brightness: 1.5
});

let currentIndex = 10;
function showState(index = 10) {
    currentIndex = index;
    psi.real.set(states[index]);
    psi.imag.fill(0);
    simulation.setLatexTitle(`\\text{Eigenstate ${index + 1} of}\\ ` + HarmonicOscillator.latex)
}
showState();

let staticView = false;
simulation
    .bind(psi.alwaysWith(waveFunction))
    .runsEvery(0.01)
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
    .append(new Checkbox("Static")
        .checked(staticView)
        // @ts-ignore
        .onChange(event => staticView = event.target.checked)
    )
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, states.length - 1, 1))
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
        values: energies,
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
