import {
    WaveFunctionSurface3D, DiscreteComplexField, Simulation, Vec3, Slider, Range, RadioGroup,
    GaussianImpulseComplex2D, Checkbox, DiscreteFieldBoxView, DiscreteScalarField, Hamiltonian,
    ShapeConfiguration, Softness, Potential, ComplexSurfaceView2D, DiscreteFieldSurfaceView, FixedIntervalNormalizer
} from '../../../src/index.js';

const NX = 400;
const NY = 400;
const dt = 0.24;		// anything less than 0.25 seems to be stable

const potential = new DiscreteScalarField({ nx: NX, ny: NY });
const psi = new DiscreteComplexField({ nx: NX, ny: NY });
const hamiltonian = new Hamiltonian({\n    potential,\n    spatialNdim: 2,\n    N: NX,\n    extent: 20,\n    hbar: Math.sqrt(2),\n    mass: 1,\n    potentialScale: 2\n});
const gaussianImpulse = new GaussianImpulseComplex2D();

/**
 * @param {ShapeConfiguration} shapeConfig
 * @param {number} potentialStrength
 * @param {number} softness
 */
function reset(shapeConfig, potentialStrength, softness) {
    hamiltonian.resetEvolution();
    psi
        .reset()
        .apply(gaussianImpulse);
    potential
        .reset()
        .apply(new Potential(shapeConfig, potentialStrength))
        .apply(new Softness({ softness }));
}

const waveFunctionSurface = new WaveFunctionSurface3D();
const potentialBarrier = new DiscreteFieldBoxView({ width: NX, height: NY });

const waveFunctionSurface2d = new ComplexSurfaceView2D();
const potentialBarrier2d = new DiscreteFieldSurfaceView({
    normalizer: new FixedIntervalNormalizer()
});
waveFunctionSurface2d.visible = false;
potentialBarrier2d.visible = false;

const shapeConfiguration = new ShapeConfiguration();
let softness = 2;
let potentialStrength = 0.1;
shapeConfiguration.onChangeEventListener = () => reset(shapeConfiguration, potentialStrength, softness);
reset(shapeConfiguration, potentialStrength, softness);

const simulation = Simulation
    .with({
        htmlDivId: 'quantumScattering',
        viewport: {
            aspectRatio: '19/12'
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .appendStartStopResetUI()
    .bind(psi.alwaysWith(waveFunctionSurface))
    .bind(psi.alwaysWith(waveFunctionSurface2d))
    .bind(potential.onceWith(potentialBarrier))
    .bind(potential.onceWith(potentialBarrier2d))
    .onReset(() => reset(shapeConfiguration, potentialStrength, softness))
    .maxOutCpu(() => hamiltonian.evolve(psi, dt), 20, 10)
    .append(new RadioGroup()
        .add('2D', _ => setDimension(false))
        .add('3D', _ => setDimension(true))
        .checked(1))
    .append(new Checkbox('🌈 Show phase color ')
        .checked(true)
        .onChange(event => {
            waveFunctionSurface2d.phaseColor = event.target.checked;
            waveFunctionSurface.phaseColor = event.target.checked;
        })
    )
    .append(new Slider('🏃 Packet energy ')
        .on(gaussianImpulse)
        .withProperty('wavePacketEnergy')
        .withRange(new Range(0.001, 0.1, 0.001))
        .withValue(0.050)
        .addEventListener('input', () => reset(shapeConfiguration, potentialStrength, softness))
    )
    .append(new Slider('🪜 Height scale')
        .withRange(new Range(10, 25, 0.1))
        .withValue(waveFunctionSurface.zScale)
        .on(waveFunctionSurface)
        .withProperty('zScale')
    )
    .append(shapeConfiguration.ui())
    .append(new Slider('💪🏻 Energy barrier')
        .withRange(new Range(-0.1, 0.1, .001))
        .withValue(potentialStrength)
        .addEventListener('input', event => {
            potentialStrength = Number(event.target.value);
            reset(shapeConfiguration, potentialStrength, softness);
        })
    )
    .append(new Slider('🧸 Softness')
        .withRange(new Range(0, 20, 1))
        .withValue(softness)
        .addEventListener('input', event => {
            softness = Number(event.target.value);
            reset(shapeConfiguration, potentialStrength, softness);
        }));

function setDimension(dimension3d = true) {
    waveFunctionSurface.visible = dimension3d;
    potentialBarrier.visible = dimension3d;
    waveFunctionSurface2d.visible = !dimension3d;
    potentialBarrier2d.visible = !dimension3d;
    simulation.orthographic = !dimension3d;
    if (dimension3d)
        simulation.frameSceneOn(waveFunctionSurface, {padding: .6, translationY: 0, viewDirection: new Vec3(-1, .7, .75)});
    else
        simulation.frameSceneOn(waveFunctionSurface2d, {padding: 1.0, translationY: 0, viewDirection: new Vec3(0, 0, 1)});
}

setDimension();