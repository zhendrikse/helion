import {
    ColorMappers, DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface, LaplaceOperator,
    SurfaceResolution, WaveEquationSolver, GaussianImpulse, InstancedMeshSurfaceView
} from "../../../src/index.js";

export class WaveEquation {
    constructor({
        velocity = 1,
        damping = 0.1
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
const solver = new WaveEquationSolver(new WaveEquation({ velocity: 5 }));
const surface = new DiscreteFieldSurface(field);

const water = new InstancedMeshSurfaceView({
    resolution: new SurfaceResolution(256, 256),
    normalizer: new Interval(-0.25, 2),
    colorMapper: ColorMappers.create(ColorMappers.Type.WaterAlternative)
});
water.position.set(-128, 0, -128);

Simulation
    .with({
        htmlDivId: "raindropContainer",
        cameraPosition: new Vec3(4, 2, 4.2).multiplyScalar(75),
        fieldOfView: 19
    })
    .synchronize(surface.alwaysWith(water))
    .onClockTick(() => {
        field.evolve(solver, 0.02);
        if (Math.random() > 0.02)
            return;
        
        field.apply(new GaussianImpulse( {
            centerX: Math.floor(Math.random() * 256),
            centerY: Math.floor(Math.random() * 256),
            amplitude: .75,
            sigma: 1
        }));
    }, 5)
    .append(water.controls())
    .append(water.shapeSelector)
    .start();
