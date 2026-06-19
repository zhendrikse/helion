import {
    ComplexScalarFieldSurfaceRaster, DiscreteComplexField, Simulation, Vec3, Slider, Range, PotentialField,
    SchrodingerSolver, GaussianImpulseComplex2D, Checkbox, PotentialField3DRaster
} from "../../../src/index.js";

let xMax = 400;
const dt = 0.24;		// anything less than 0.25 seems to be stable

const potential = new PotentialField({ nx: xMax, ny: xMax });
const psi = new DiscreteComplexField({ nx: xMax, ny: xMax });
const solver = new SchrodingerSolver(potential);
const gaussianImpulse = new GaussianImpulseComplex2D();

function reset() {
    psi.reset();
    solver.initialize(psi, dt);
    psi.apply(gaussianImpulse);
    potential.reset();
}

const waveFunctionSurface = new ComplexScalarFieldSurfaceRaster({
    width: xMax,
    height: xMax
});

reset();

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
    .append(new Slider("🪜 Height scale")
        .withRange(new Range(10, 25, 0.1))
        .withValue(waveFunctionSurface.zScale)
        .on(waveFunctionSurface)
        .withProperty("zScale")
    )
    .append(new Slider("🏃 Packet energy ")
        .on(gaussianImpulse)
        .withProperty("wavePacketEnergy")
        .withRange(new Range(0.001, 0.1, 0.001))
        .withValue(0.050)
        .addEventListener("change", () => reset())
    )
    .append(new Slider("💪🏻 Energy barrier")
        .on(potential)
        .withProperty("energy")
        .withRange(new Range(-0.1, 0.1, .001))
        .withValue(0.1)
        .addEventListener("change", () => reset())
    )
    .append(new Slider("📐 Size")
        .on(potential)
        .withProperty("size")
        .withRange(new Range(0, 50, 1))
        .withValue(40)
        .addEventListener("change", () => reset())
    )
    .append(new Slider("🧸 Softness")
        .on(potential)
        .withProperty("softness")
        .withRange(new Range(0, 20, 1))
        .withValue(0)
        .addEventListener("change", () => reset())
    )
    .append(potential.shapeSelector)
    .append(new Checkbox("🌈 Show phase color ")
        .on(waveFunctionSurface)
        .withProperty("phaseColor")
        .checked(true));
