import {
    DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface,
    WaveEquationSolver, PotentialField3DRaster, FixedIntervalNormalizer,
    SineImpulsOperator, ShapeConfiguration, BarrierWaveEquation, ShapeMask, SurfaceVisualization, HeightLayer,
    SurfaceLayer, GlyphLayer, SurfaceResolution, ColorMappersFactory, RadioGroup, RadioButton, Checkbox
} from "../../../src/index.js";

const resolution = 256;
const surfaceLayer = new SurfaceLayer({
    resolution: new SurfaceResolution(resolution, resolution),
    colorLayer: new HeightLayer(),
    colorMapper: ColorMappersFactory.create(ColorMappersFactory.Type.WaterAlternative),
    normalizer: new FixedIntervalNormalizer(new Interval(-1, 1)),
    opacity: 0.4
});
const glyphLayer = new GlyphLayer({
    resolution: new SurfaceResolution(resolution, resolution),
    glyphType: GlyphLayer.GlyphTypes.BOXES,
    colorLayer: new HeightLayer(),
    colorMapper: ColorMappersFactory.create(ColorMappersFactory.Type.WaterAlternative),
    normalizer: new FixedIntervalNormalizer(new Interval(-1, 1)),
    opacity: 0.4
});

const waterSurface = new SurfaceVisualization(surfaceLayer);
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
    .withStartStopResetButtons()
    .synchronize(surface.alwaysWith(waterSurface))
    .synchronize(obstacleField.onceWith(new PotentialField3DRaster({
        width: resolution,
        height: resolution,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .incrementsTimeBy(0.02)
    .onTimeScale(3)
    .onStep((_, dt) => field.evolve(solver, dt))
    .onReset(() => reset(configuration))
    .append(waveEquation.controls())
    .append(sineImpuls.controls())
    .append(configuration.controls())
    .append(waterSurface.controls())
    .append(
        new RadioGroup(
            new RadioButton("Smooth")
                .addEventListener("change", () => waterSurface.meshLayer = surfaceLayer),

            new RadioButton("Glyphs")
                .addEventListener("change", () => waterSurface.meshLayer = glyphLayer),
        ).checked(0)
    )
    .append(glyphLayer.controls())
    .append(new Checkbox("Wireframe ")
            .on(surfaceLayer)
            .withProperty("wireframe")
    );
