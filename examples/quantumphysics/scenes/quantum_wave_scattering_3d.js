import {
    ComplexScalarFieldSurfaceRaster, DiscreteComplexField, Simulation, Vec3, Slider, Range,
    SchrodingerSolver, GaussianImpulseComplex2D, Checkbox, PotentialField3DRaster, DiscreteScalarField,
    ShapeFactory, ShapeConfiguration, Softness
} from "../../../src/index.js";

let xMax = 400;
const dt = 0.24;		// anything less than 0.25 seems to be stable

const potential = new DiscreteScalarField({ nx: xMax, ny: xMax });
const psi = new DiscreteComplexField({ nx: xMax, ny: xMax });
const solver = new SchrodingerSolver(potential);
const gaussianImpulse = new GaussianImpulseComplex2D();

function reset(settings) {
    psi.reset();
    solver.initialize(psi, dt);
    psi.apply(gaussianImpulse);
    potential.reset();
    potential.apply(ShapeFactory.create(settings.shape, {
        reflectionStrength: settings.strength,
        size: settings.size
    }));
    potential.apply(new Softness({ softness: settings.softness }));
}

const waveFunctionSurface = new ComplexScalarFieldSurfaceRaster({
    width: xMax,
    height: xMax
});

const configuration = new ShapeConfiguration();
configuration.onChange = () => reset(configuration.settings);
reset(configuration.settings);

Simulation
    .with({
        htmlDivId: "doubleSlit3dContainer",
        headUpDisplay: true,
        cameraPosition: new Vec3(-1, .7, .75).multiplyScalar(.75 * xMax),
        fov: 30
    })
    .withStartStopResetButtons()
    .synchronize(psi.alwaysWith(waveFunctionSurface))
    .synchronize(potential.onceWith(new PotentialField3DRaster({
        width: xMax,
        height: xMax
    })))
    .onReset(() => reset())
    .onClockTick(() => psi.evolve(solver, dt), 15)
    .append(new Checkbox("🌈 Show phase color ")
        .on(waveFunctionSurface)
        .withProperty("phaseColor")
        .checked(true)
    )
    .append(new Slider("🏃 Packet energy ")
        .on(gaussianImpulse)
        .withProperty("wavePacketEnergy")
        .withRange(new Range(0.001, 0.1, 0.001))
        .withValue(0.050)
        .addEventListener("input", () => reset())
    )
    .append(new Slider("🪜 Height scale")
        .withRange(new Range(10, 25, 0.1))
        .withValue(waveFunctionSurface.zScale)
        .on(waveFunctionSurface)
        .withProperty("zScale")
    )
    .append(new Checkbox("🌈 Show phase color ")
        .on(waveFunctionSurface)
        .withProperty("phaseColor")
        .checked(true)
    )
    .append(configuration.controls());
