import {
    Canvas, ColorMappers, DiscreteScalarField, HtmlDiv, Interval, Simulation, Vec3, StandardSurfaceView,
    SphereSurfaceView, ScalarFieldSurface, ThreeJsRenderer, ThreeJsRenderOptions, LaplaceOperator, SurfaceResolution,
    WaveEquationSolver, GaussianImpulse
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

const field = new DiscreteScalarField({ nx: 256, ny: 256 });
const equation = new WaveEquation({ velocity: 5 });
const solver = new WaveEquationSolver(field, equation);
const surface = new ScalarFieldSurface(field);

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("raindropCanvasWrapper")
        .contains(Canvas.withElementId("raindropCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(25, 10, 10).multiplyScalar(50),
        fieldOfView: 20
    }));

const water = new StandardSurfaceView({
    contours: false,
    // radius: .75,
    resolution: new SurfaceResolution(128, 128),
    normalizer: new Interval(-0.25, 2),
    colorMapper: ColorMappers.WaterAlternative
});

renderer.frameSceneOn(water, {padding: 175, translationY: -350});

const simulation = Simulation
    .with(renderer)
    .synchronize(surface.alwaysWith(water))
    .onClockTick(() => {
        solver.step(0.02);
        if (Math.random() < 0.02)
            field.apply(new GaussianImpulse( {
                centerX: Math.floor(Math.random() * 256),
                centerY: Math.floor(Math.random() * 256),
                amplitude: .75,
                sigma: 1
            }));
    }, 5)
    .start();