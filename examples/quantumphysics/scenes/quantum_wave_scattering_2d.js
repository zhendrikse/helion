import {
    ComplexScalarFieldRaster, DiscreteComplexField, Simulation, Vec3, Slider, Range,
    SchrodingerSolver, GaussianImpulseComplex2D, ScalarFieldIntensityPixelRaster, Checkbox, ShapeOperators,
    DiscreteScalarField, DropdownMenu, Softness
} from "../../../src/index.js";

let xMax = 400;
const dt = 0.24;		// anything less than 0.25 seems to be stable
let currentShape = ShapeOperators.Type.DoubleSlit;
const potential = new DiscreteScalarField({ nx: xMax, ny: xMax });
const psi = new DiscreteComplexField({ nx: xMax, ny: xMax });
const solver = new SchrodingerSolver(potential);
const gaussianImpulse = new GaussianImpulseComplex2D();

function reset() {
    psi.reset();
    solver.initialize(psi, dt);
    psi.apply(gaussianImpulse);
    potential.reset();
    potential.apply(ShapeOperators.create(currentShape, { reflectionStrength: .1 }));
    potential.apply(new Softness());
}

const waveFunctionRaster = new ComplexScalarFieldRaster({
    width: xMax,
    height: xMax
});

reset();
Simulation
    .with({
        htmlDivId: "doubleSlit2dContainer",
        controls: false,
        headUpDisplay: true,
        cameraPosition: new Vec3(0, 0, xMax)
    })
    .withStartStopResetButtons()
    .synchronize(psi.alwaysWith(waveFunctionRaster))
    .synchronize(potential.onceWith(new ScalarFieldIntensityPixelRaster({
        width: xMax,
        height: xMax
    })))
    .onReset(() => reset())
    .onClockTick(() => psi.evolve(solver, dt), 15)
    .append(new Slider("🔆 Brightness ")
        .withRange(new Range(0.1, 2, 0.01))
        .withValue(1)
        .on(waveFunctionRaster)
        .withProperty("brightness")
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
    .append(new DropdownMenu()
        .for(new ShapeOperators())
        .withValue(currentShape)
        .addEventListener("change", event => {
            currentShape = event.target.value;
            reset();
        })
    )
    .append(new Checkbox("🌈 Show phase color ")
        .on(waveFunctionRaster)
        .withProperty("phaseColor")
        .checked(true));
