import {
    DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface,
    WaveEquationSolver, PotentialField3DRaster, FixedIntervalNormalizer,
    SineImpulsOperator, ShapeConfiguration, BarrierWaveEquation, ShapeMask, SurfaceVisualization, HeightLayer,
    SurfaceResolution, RadioGroup, RadioButton, Checkbox, ColorMappers
} from "../../../src/index.js";

const resolution = 256;
const waterSurface = new SurfaceVisualization({
    resolution: new SurfaceResolution(resolution, resolution),
    colorMapper: new ColorMappers().get(ColorMappers.WaterAlternative)(),
    normalizer: new FixedIntervalNormalizer(new Interval(-1, 1)),
    opacity: 0.9
})
waterSurface.position.set(-resolution * .5, 0, -resolution * .5);
waterSurface.displaySurfaceLayer();

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
function reset(shapeConfig) {
    field
        .reset()
        .apply(sineImpuls);
    solver.reset();
    obstacleField
        .reset()
        .apply(new ShapeMask(shapeConfig));
}

const configuration = new ShapeConfiguration();
configuration.onChangeEventListener = () => reset(configuration);
reset(configuration);

Simulation
    .with({
        htmlDivId: "waveScatteringContainer",
        cameraPosition: new Vec3(2, 1, 2.1).multiplyScalar(resolution * .75),
        fieldOfView: 19,
        headUpDisplay: true
    })
    .bind(surface.alwaysWith(waterSurface))
    .bind(obstacleField.onceWith(new PotentialField3DRaster({
        width: resolution,
        height: resolution,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .runsEvery(0.02)
    .atSpeed(3)
    .onStep((_, dt) => field.evolve(solver, dt))
    .onReset(() => reset(configuration))
    .appendStartStopResetUI()
    .append(waveEquation.ui())
    .append(sineImpuls.ui())
    .append(configuration.ui())
    .append(waterSurface.ui())
    .append(
        new RadioGroup(
            new RadioButton("Smooth")
                .addEventListener("change", () => waterSurface.displaySurfaceLayer()),

            new RadioButton("Glyphs")
                .addEventListener("change", () => waterSurface.displayGlyphLayer()),
        ).checked(0)
    )
    .append(waterSurface.glyphLayer.ui())
    .append(new Checkbox("Wireframe ")
            .on(waterSurface.surfaceLayer)
            .withProperty("wireframe")
    );
