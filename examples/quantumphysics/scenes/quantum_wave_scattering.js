import {
    DiscreteComplexFieldSurfaceView, DiscreteComplexField, Simulation, Vec3, Slider, Range, RadioGroup,
    SchrodingerSolver, GaussianImpulseComplex2D, Checkbox, DiscreteFieldBoxView, DiscreteScalarField,
    ShapeConfiguration, Softness, Potential, DiscreteComplexFieldSurfaceView2D, DiscreteFieldSurfaceView, SurfaceResolution,
} from "../../../src/index.js";

let xMax = 400,
    width = xMax,
    height = xMax;
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

const waveFunctionSurface = new DiscreteComplexFieldSurfaceView({
    resolution: new SurfaceResolution(width, height)
});
const potentialBarrier = new DiscreteFieldBoxView({ width, height });

const waveFunctionSurface2d = new DiscreteComplexFieldSurfaceView2D({
    resolution: new SurfaceResolution(width, height)
});
const potentialBarrier2d = new DiscreteFieldSurfaceView({
    resolution: new SurfaceResolution(width, height)
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
        htmlDivId: "quantumScattering",
        camera: {
            position: new Vec3(-1, .7, .75).multiplyScalar(1.25 * xMax),
            fieldOfView: 30
        },
        viewport: {
            aspectRatio: "19/12"
        }
    })
    .appendStartStopResetUI()
    .bind(psi.alwaysWith(waveFunctionSurface))
    .bind(psi.alwaysWith(waveFunctionSurface2d))
    .bind(potential.onceWith(potentialBarrier))
    .bind(potential.onceWith(potentialBarrier2d))
    .onReset(() => reset(shapeConfiguration, potentialStrength, softness))
    .maxOutCpu(() => psi.evolve(solver, dt), 20, 10)
    .append(new RadioGroup()
        .add("2D", event => setDimension(false))
        .add("3D", event => setDimension(true))
        .checked(1))
    .append(new Checkbox("🌈 Show phase color ")
        .checked(true)
        .onChange(event => {
            waveFunctionSurface2d.phaseColor = event.target.checked;
            waveFunctionSurface.phaseColor = event.target.checked;
        })
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
    .append(shapeConfiguration.ui())
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

function setDimension(dimension3d = true) {
    waveFunctionSurface.visible = dimension3d;
    potentialBarrier.visible = dimension3d;
    waveFunctionSurface2d.visible = !dimension3d;
    potentialBarrier2d.visible = !dimension3d;
    simulation.cameraPosition = dimension3d ?
        new Vec3(-1, .7, .75).multiplyScalar(.75 * xMax) :
        new Vec3(0, 0, xMax)
}
