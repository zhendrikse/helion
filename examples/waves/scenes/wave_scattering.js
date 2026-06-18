import {
    ColorMappers, DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface, LaplaceOperator,
    SurfaceResolution, WaveEquationSolver, GaussianImpulse, InstancedMeshSurfaceView, ColorMap, PotentialField,
    PotentialField3DRaster, StandardSurfaceView
} from "../../../src/index.js";

// TODO hardcoded 256 resolution => constant

export class WaveEquation {
    constructor({
        velocity = 1,
        damping = 0.05
    } = {}) {
        this._velocity = velocity;
        this._damping = damping;
    }

    get damping() { return this._damping; }

    acceleration(field, i, j) {
        return this._velocity * this._velocity * LaplaceOperator.at(field, i, j);
    }
}

//
// First, declare a (discrete) scalar field and a wave equation.
// Next, define a solver on this field for this equation.
// Finally, define a surface that can visualize the (scalar) field.
//
const field = new DiscreteScalarField({ nx: 256, ny: 256 });
const surface = new DiscreteFieldSurface(field);

const water = new StandardSurfaceView({
    resolution: new SurfaceResolution(256, 256),
    normalizer: new Interval(-2, 2),
    colorMapper: ColorMappers.get(ColorMap.WaterAlternative),
    contours: false,
});
water.position.set(-128, 0, -128);

export class BarrierWaveEquation {
    constructor({
        velocity = 1,
        damping = 0.1,
        barrier
    } = {}) {
        this.velocity = velocity;
        this.damping = damping;
        this.barrier = barrier;
    }

    acceleration(field, i, j) {
        const transmission = 1.0 - this.barrier.valueAt(i, j);
        // const transmission =
        //     Math.exp(-10 * this.barrier.valueAt(i,j));
        return transmission * this.velocity * this.velocity * LaplaceOperator.at(field, i, j);
    }
}

const barrier = new PotentialField({
    nx: 256,
    ny: 256,
    energy: 1.0
});
const equation = new BarrierWaveEquation({
    velocity: 10,
    damping: 0.01,
    barrier
});
const solver = new WaveEquationSolver(field, equation);

const dt = 0.02;
Simulation
    .with({
        htmlDivId: "waveScatteringContainer",
        cameraPosition: new Vec3(4, 2, 4.2).multiplyScalar(100),
        fieldOfView: 19,
        headUpDisplay: true
    })
    .incrementsTimeBy(dt)
    .withMouseClickEventListener()
    .synchronize(surface.alwaysWith(water))
    .synchronize(barrier.onceWith(new PotentialField3DRaster({
        width: 256,
        height: 256,
        heightScale: 20,
        opacity: 0.5,
        color: 0x008080
    })))
    .onClockTick((clock, time) => {
        solver.step(dt);
        if (time < 2.0) {

            const pulse = 3 * Math.sin(10 * time);

            for (let y = 0; y < field.ny; y++)
                field.setValueAt(5, y, pulse);
        }
    }, 5)
    .append(water.colormapSelector)
    .append(water.shapeSelector);
