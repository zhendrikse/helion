import {
    ColorMappersFactory, DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface,
    SurfaceResolution, WaveEquationSolver, PotentialField3DRaster, StandardSurfaceView,
    ShapeFactory, SineImpulsOperator, ShapeConfiguration, Softness, BarrierWaveEquation
} from "../../../src/index.js";

const resolution = 256;

const waterSurface = new StandardSurfaceView({
    resolution: new SurfaceResolution(resolution, resolution),
    normalizer: new Interval(-3, 3),
    colorMapper: ColorMappersFactory.create(ColorMappersFactory.Type.WaterAlternative),
    contours: false,
});
waterSurface.position.set(-resolution * .5, 0, -resolution * .5);

const field = new DiscreteScalarField({ nx: resolution, ny: resolution });
const surface = new DiscreteFieldSurface(field);
const obstacleField = new DiscreteScalarField({ nx: resolution, ny: resolution });
const waveEquation = new BarrierWaveEquation({
    velocity: 10,
    damping: 0.01,
    obstacleField
});
const solver = new WaveEquationSolver(waveEquation);

const sineImpuls = new SineImpulsOperator({
    amplitude: 0.5
});
function reset(settings) {
    field.reset();
    field.apply(sineImpuls);
    solver.reset();
    obstacleField.reset();
    obstacleField.apply(ShapeFactory.create(settings.shape, {
        reflectionStrength: settings.strength,
        size: settings.size
    }));
    obstacleField.apply(new Softness({ softness: settings.softness }));
}

const configuration = new ShapeConfiguration();
configuration.onChange = () => reset(configuration.settings);
reset(configuration.settings);

const dt = 0.02;
Simulation
    .with({
        htmlDivId: "waveScatteringContainer",
        cameraPosition: new Vec3(2, 1, 2.1).multiplyScalar(resolution * .75),
        fieldOfView: 19,
        headUpDisplay: true
    })
    .withStartStopResetButtons()
    .incrementsTimeBy(dt)
    .synchronize(surface.alwaysWith(waterSurface))
    .synchronize(obstacleField.onceWith(new PotentialField3DRaster({
        width: resolution,
        height: resolution,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .onClockTick(() => field.evolve(solver, dt), 5)
    .onReset(() => reset(configuration.settings))
    .append(waterSurface.controls())
    .append(waveEquation.controls())
    .append(sineImpuls.controls())
    .append(configuration.controls());
