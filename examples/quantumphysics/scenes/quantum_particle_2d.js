import {
    Checkbox, AnisotropicHarmonicOscillator, Hamiltonian, Range, Simulation, Colour, Registry,
    Slider, Vec3, RadioGroup, WaveFunctionSurface3D, HarmonicOscillator,
    DoubleWell, CircularWell, Quartic, Coulomb, InfiniteSquareWell, UPlotBarGraph, WaveFunction2D,
    DropdownMenu, SingleParticle, LanczosEigenstateSolver, ProbabilityDensityView2D
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
    },
    'Coulomb (hydrogen-like)': {
        func: Coulomb.withNuclearCharge(1, .2),
        latex: Coulomb.latex
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
            text: '<strong>🫐 Quantum particle eigenstates</strong><br/>This demo calculates ' +
                'the eigenstates for a two-dimensional particle and various potentials.\n\n' +
                'Each state reveals a characteristic pattern of amplitude ' +
                'and phase, forming the familiar wave-like lobes of quantum mechanics.\n'
        }
        });

const psi = new WaveFunction2D(N);
let currentEigenstate = 8;
function changeState(index = 8) {
    currentEigenstate = index;
    psi.collapseToEigenstate(index);
    simulation.setLatexTitle(`\\text{Eigenstate ${index + 1} of}\\ ` + potentials[potentialType].latex)
}

const barGraph = new UPlotBarGraph({
    values: [],
    title: 'Eigenstate energies',
    xLabel: 'Eigenstate',
    yLabel: 'Energy',
    labelColor: Colour.Yellow,
    color: new Colour(0.5, 0.5, 1)
});

let hamiltonian;
let potentialType = 'Coulomb (hydrogen-like)';
let isSolving = false;
let showProbabilityCloud = false;
/** @param {string} potential */
async function solveFor(potential = potentialType) {
    potentialType = potential;
    hamiltonian = new Hamiltonian({
        potential: potentials[potential].func,
        spatialNdim: 2,
        N
    });
    isSolving = true;

    psi.reset();
    const solver = new LanczosEigenstateSolver({
        hamiltonian,
        states: 15,
        iterations: 850,
        calculateResiduals: false
    });
    const residuals = await solver.solveAsync(
        psi,
        (text, percent) => simulation.showHud(text + `: ${Math.round(percent)}%`)
    );
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

//
// Views
//
const waveFunctionSurface = new WaveFunctionSurface3D({
    zScale: 5,
    brightness: .5
});

const probabilityDensityView = new ProbabilityDensityView2D({
    pointCount: 30000,
    pointSize: 0.1,
    color: Colour.Yellow
});

//
// Simulation
//
let staticView = false;
let is3d = true;
simulation
    .bind(psi.state.alwaysWith(waveFunctionSurface))
    .bind(psi.state.onceWith(probabilityDensityView))
    .runsEvery(0.01)
    .onStep((clock, dt) => {
        if (staticView || isSolving)
            return;

        psi.time = clock.simulatedTime;
    })
    .append(new DropdownMenu()
        .for(potentialsRegistry)
        .withValue('Coulomb (hydrogen-like)')
        .onChange(event => solveFor(String(/** @type {HTMLInputElement} */ (event.target).value)))
    )    
    .append(new Slider('🌀 Eigenstate')
        .withRange(new Range(0, psi.eigenstatesCount - 1, 1))
        .withValue(currentEigenstate)
        .addEventListener('input', event => changeState(Number(/** @type {HTMLInputElement} */(event.target).value)))
    )
    .append(new Slider('📐 Height scale')
        .withRange(new Range(1, 10, .1))
        .withValue(waveFunctionSurface.zScale)
        .on(waveFunctionSurface)
        .withProperty('zScale')
    )
    .append(new RadioGroup()
        .add('2D', _ => updateView(false, showProbabilityCloud))
        .add('3D', _ => updateView(true, showProbabilityCloud))
        .checked(1))
    .append(new Checkbox("Probability cloud")
        .checked(showProbabilityCloud)
        .onChange(event =>
            updateView(is3d, Boolean(/** @type {HTMLInputElement} */(event.target.checked))))
    )
    .append(new Checkbox("Static")
        .checked(staticView)
        .onChange(event => staticView = Boolean(/** @type {HTMLInputElement} */(event.target.checked)))
    )
    .addGraph(barGraph)
    .start();

/**
 * @param {boolean} dimension3d
 * @param {boolean} showPointCloud
 */
const updateView = (dimension3d, showPointCloud)=> {
    is3d = dimension3d
    showProbabilityCloud = showPointCloud;
    probabilityDensityView.visible = showProbabilityCloud && !is3d;
    waveFunctionSurface.visible = !showProbabilityCloud || (showProbabilityCloud && is3d);
    simulation.frameSceneOn(waveFunctionSurface, {
        padding: .5, 
        viewDirection: dimension3d ? new Vec3(-1.25, .7 , .75) : new Vec3(0, 1, 0)
    });
}
updateView(is3d, showProbabilityCloud);
