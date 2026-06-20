import {
    ColorMappers, DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface, LaplaceOperator,
    SurfaceResolution, WaveEquationSolver, PotentialField3DRaster, StandardSurfaceView,
    ShapeOperators, DropdownMenu, ShapeConfiguration, Softness
} from "../../../src/index.js";

const resolution = 256;
let currentShape = ShapeOperators.Type.DoubleSlit;

const water = new StandardSurfaceView({
    resolution: new SurfaceResolution(resolution, resolution),
    normalizer: new Interval(-3, 3),
    colorMapper: ColorMappers.create(ColorMappers.Type.WaterAlternative),
    contours: false,
});
water.position.set(-resolution * .5, 0, -resolution * .5);

export class BarrierWaveEquation {
    constructor({
        obstacleField,
        velocity = 1,
        damping = 0.1
    } = {}) {
        this.velocity = velocity;
        this.damping = damping;
        this.obstacleField = obstacleField;
    }

    acceleration(field, i, j) {
        const transmission = 1.0 - this.obstacleField.valueAt(i, j);
        //const transmission = Math.exp(-10 * this.barrier.valueAt(i, j));
        return transmission * this.velocity * this.velocity * LaplaceOperator.at(field, i, j);
    }
}

const field = new DiscreteScalarField({ nx: resolution, ny: resolution });
const surface = new DiscreteFieldSurface(field);

const obstacleField = new DiscreteScalarField({ nx: resolution, ny: resolution });
obstacleField.apply(ShapeOperators.create(currentShape, {
    size: 20
}));

const solver = new WaveEquationSolver(new BarrierWaveEquation({
    velocity: 10,
    damping: 0.01,
    obstacleField
}));

const dt = 0.02;
const configuration = new ShapeConfiguration();
configuration.onChange = () => {
    solver.reset();
    field.reset();
    obstacleField.reset();
    obstacleField.apply(ShapeOperators.create(configuration.settings.shape, {
        reflectionStrength: configuration.settings.strength,
        size: configuration.settings.size
    }));
    obstacleField.apply(new Softness({ softness: configuration.settings.softness }));
};

Simulation
    .with({
        htmlDivId: "waveScatteringContainer",
        cameraPosition: new Vec3(2, 1, 2.1).multiplyScalar(resolution * .75),
        fieldOfView: 19,
        headUpDisplay: true
    })
    .incrementsTimeBy(dt)
    .withMouseClickEventListener()
    .synchronize(surface.alwaysWith(water))
    .synchronize(obstacleField.onceWith(new PotentialField3DRaster({
        width: resolution,
        height: resolution,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .onClockTick((clock, time) => {
        field.evolve(solver, dt);
        if (time < 2.0) {
            const pulse = 3 * Math.sin(4 * time);

            for (let y = 0; y < field.ny; y++)
                field.setValueAt(5, y, pulse);
        }
    }, 5)
    .onReset(() => {
        solver.reset();
        obstacleField.apply(ShapeOperators.create(currentShape)); // Obstacle has been fully reset at this point!
    })
    .append(water.colormapSelector)
    .append(configuration.controls());
