import {
    Checkbox, DiscreteComplexField, Hamiltonian, Range, Simulation, Colour, Registry,
    Slider, Vec3, WaveFunctionSurface3D, HarmonicOscillator, AnisotropicHarmonicOscillator,
    DoubleWell, CircularWell, Quartic, InfiniteSquareWell, UPlotBarGraph, WaveFunction2D, 
    DropdownMenu, SingleParticle
} from '../../../src/index.js';

const N = 110;

const potentials = /** @type {Record<string, { func: (particle: SingleParticle) => number, latex: string }>} */ ({
    'Harmonic oscillator': {
        func: HarmonicOscillator.withSpringConstant(0.05),
        latex: HarmonicOscillator.latex
    },
    'Anisotropic harmonic': {
        func: AnisotropicHarmonicOscillator.withSpringConstants(0.2, 0.025),
        latex: AnisotropicHarmonicOscillator.latex
    },
    'Double well': {
        func: DoubleWell.withConstants(.1, 2.65, 0.05),
        latex: DoubleWell.latex
    },
    'Infinite square well': {
        func: InfiniteSquareWell.withoutParameters(),
        latex: InfiniteSquareWell.latex
    },
    'Quartic': {
        func: Quartic.withConstant(1e-3),
        latex: Quartic.latex
    },
    'Circular well': {
        func: CircularWell.withRadiusAndBarrier(8, 100),
        latex: CircularWell.latex
    }
});

const potentialsRegistry = new Registry({
    label: "💪 Potential ",
    entries: potentials
});

const simulation = Simulation
    .with({
        htmlDivId: 'qmsolveEigenstates',
        viewport: {aspectRatio: '4/3', parameterMenuCollapsed: false },
        infoPanel: {
            text: '<strong>🫐 Stationary eigenstates</strong><br/>Stationary ' +
                'eigenstates for various potentials.\n\n' +
                'Each state reveals a characteristic pattern of amplitude ' +
                'and phase, forming the familiar wave-like lobes of quantum mechanics.\n'
        }
        });

let potentialType = 'Harmonic oscillator';
const psi = new WaveFunction2D(N);
let currentEigenstate = 10;
function changeState(index = 10) {
    currentEigenstate = index;
    psi.collapseToEigenstate(index);
    simulation.setLatexTitle(`\\text{Eigenstate ${index + 1} of}\\ ` + potentials[potentialType].latex)
}

let hamiltonian;
let isSolving = false;
const barGraph = new UPlotBarGraph({
    values: [],
    title: 'Eigenstate energies',
    xLabel: 'Eigenstate',
    yLabel: 'Energy',
    labelColor: Colour.Yellow,
    color: new Colour(0.5, 0.5, 1)
});

async function solveFor(potential = potentialType) {
    potentialType = potential;
    hamiltonian = new Hamiltonian({
        progressCallback: (text, percent) => simulation.showHud(text + `: ${Math.round(percent)}%`),
        potential: potentials[potential].func,
        spatialNdim: 2,
        N
    });
    isSolving = true;

    psi.reset();
    const residuals = await psi.apply(hamiltonian, {
        maxStates: 15,
        iterations: 850,
        calculateResiduals: false
    });
    // for (const residual of residuals)
    //     console.log(residual);
    // for (const energy of psi.spectrum)
    //     console.log(energy);
    simulation.hideHud();
    barGraph.updateValues(psi.spectrum);
    changeState(currentEigenstate);

    isSolving = false;
}
await solveFor(potentialType);

const waveFunction = new WaveFunctionSurface3D({
    zScale: 5,
    brightness: 1.5
});

let staticView = false;
simulation
    .bind(psi.state.alwaysWith(waveFunction))
    .runsEvery(0.01)
    .onStep((clock, dt) => {
        if (staticView || isSolving)
            return;

        psi.time = clock.simulatedTime;
    })
    .append(new DropdownMenu()
        .for(potentialsRegistry)
        // @ts-ignore
        .onChange(event => solveFor(event.target.value))
    )    
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, psi.eigenstatesCount - 1, 1))
        .withValue(currentEigenstate)
        // @ts-ignore
        .addEventListener('input', event => changeState(Number(event.target.value)))
    )
    .append(new Slider('📐 Height scale')
        .withRange(new Range(1, 10, .1))
        .withValue(waveFunction.zScale)
        .on(waveFunction)
        .withProperty('zScale')
    )
    .append(new Checkbox("Static")
        .checked(staticView)
        // @ts-ignore
        .onChange(event => staticView = event.target.checked)
    )
    .addGraph(barGraph)
    .frameSceneOn(waveFunction, {
        padding: 0.55,
        viewDirection: new Vec3(1, .75, 0)
    })
    .start();
