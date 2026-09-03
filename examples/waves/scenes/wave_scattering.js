import {
    DiscreteScalarField, Simulation, Vec3, DiscreteFieldSurface, WaveEquationSolver, DiscreteFieldBoxView,
    SineImpulseOperator, ShapeConfiguration, BarrierWaveEquation, ShapeMask, SurfaceVisualization,
    SurfaceResolution, RadioGroup, Checkbox, ColorMappers
} from "../../../src/index.js";

const resolution = 256;
const waterSurface = new SurfaceVisualization({
    resolution: new SurfaceResolution(resolution, resolution),
    colorMapper: new ColorMappers().get(ColorMappers.WaterAlternative)(),
    opacity: 0.9
})
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

const sineImpuls = new SineImpulseOperator({
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
        viewport: {
            aspectRatio: "19 / 12"
        },
        camera: {
            position: new Vec3(2, 1, 2.1).multiplyScalar(resolution * .75),
            aspectRatio: "19/12",
            fieldOfView: 20
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(surface.alwaysWith(waterSurface))
    .bind(obstacleField.onceWith(new DiscreteFieldBoxView({
        width: resolution,
        height: resolution,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .runsEvery(1e-3)
    .onStep((_, dt) => field.evolve(solver, 0.015))
    .onReset(() => reset(configuration))
    .appendStartStopResetUI()
    .append(waveEquation.ui())
    .append(sineImpuls.ui())
    .append(configuration.ui())
    .append(waterSurface.ui())
    .append(
        new RadioGroup()
            .add("Smooth", () => waterSurface.display(SurfaceVisualization.Display.Surface))
            .add("Glyphs", () => waterSurface.display(SurfaceVisualization.Display.Glyphs))
            .checked(0)
    )
    .append(waterSurface.glyphLayer.ui())
    .append(new Checkbox("Wireframe ")
            .on(waterSurface.surfaceLayer)
            .withProperty("wireframe")
    );
