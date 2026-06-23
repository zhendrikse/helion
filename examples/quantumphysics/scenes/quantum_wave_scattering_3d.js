import {
    ComplexScalarFieldSurfaceRaster, DiscreteComplexField, Simulation, Vec3, Slider, Range,
    SchrodingerSolver, GaussianImpulseComplex2D, Checkbox, PotentialField3DRaster, DiscreteScalarField,
    ShapeConfiguration, Softness, Potential
} from "../../../src/index.js";

let xMax = 400;
const dt = 0.24;		// anything less than 0.25 seems to be stable

const potential = new DiscreteScalarField({ nx: xMax, ny: xMax });
const psi = new DiscreteComplexField({ nx: xMax, ny: xMax });
const solver = new SchrodingerSolver(potential);
const gaussianImpulse = new GaussianImpulseComplex2D();

function reset(shapeConfig, potentialStrength, softness) {
    solver.initialize(psi, dt);
    psi
        .reset()
        .apply(gaussianImpulse);
    potential
        .reset()
        .apply(new Potential(shapeConfig, potentialStrength))
        .apply(new Softness({ softness }));
}

const waveFunctionSurface = new ComplexScalarFieldSurfaceRaster({
    width: xMax,
    height: xMax
});

const shapeConfiguration = new ShapeConfiguration();
let softness = 2;
let potentialStrength = 0.1;
shapeConfiguration.onChangeEventListener = () => reset(shapeConfiguration, potentialStrength, softness);
reset(shapeConfiguration, potentialStrength, softness);

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
    .incrementsTimeBy(dt)
    .onReset(() => reset())
    .onClockTick((clock) => psi.evolve(solver, clock.fixedDt), 15)
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
    .append(shapeConfiguration.controls())
    .append(new Slider("💪🏻 Energy barrier")
        .withRange(new Range(-0.1, 0.1, .001))
        .withValue(potentialStrength)
        .addEventListener("input", event => {
            potentialStrength = Number(event.target.value);
            reset(shapeConfiguration, potentialStrength, softness);
        })
    )
    .append(new Slider("🧸 Softness")
        .withRange(new Range(0, 20, 1))
        .withValue(softness)
        .addEventListener("input", event => {
            softness = Number(event.target.value);
            reset(shapeConfiguration, potentialStrength, softness);
        }));
