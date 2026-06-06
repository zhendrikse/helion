import {
    Canvas, ColorMappers, DiscreteScalarField, HtmlDiv, Interval, Simulation, Vec3,
    StandardSurfaceView, ScalarFieldSurface, ThreeJsRenderer, ThreeJsRenderOptions, LaplaceOperator
} from "../../../src/index.js";


export class WaveEquation {
    constructor({
        velocity = 1,
        damping = 0.2
    } = {}) {
        this._velocity = velocity;
        this._damping = damping;
    }

    get damping() { return this._damping; }

    acceleration(field, i, j) {
        return this._velocity * this._velocity * LaplaceOperator.at(field, i, j);
    }
}

export class WaveEquationSolver {
    constructor(field, equation) {
        this._field = field;
        this._equation = equation;

        const N = field.nx * field.ny;

        this._previous = new Float32Array(N);
        this._next = new Float32Array(N);
    }

    step(dt) {
        const nx = this._field.nx;
        const ny = this._field.ny;

        const current = this._field.data;
        const previous = this._previous;
        const next = this._next;

        const gamma = this._equation.damping;
        for (let i = 1; i < nx - 1; i++)
            for (let j = 1; j < ny - 1; j++) {
                const index = i + this._field.nx * j;
                const acceleration = this._equation.acceleration(this._field, i, j);
                const velocity = current[index] - previous[index];

                next[index] =
                    current[index]
                    + (1 - gamma * dt) * velocity
                    + dt * dt * acceleration;
            }

        this._previous = current.slice();
        current.set(next);
    }
}

export class GaussianImpulse {
    constructor({
        centerX = 100,
        centerY = 100,
        amplitude = 1,
        sigma = 5
    } = {}) {
        this._centerX = centerX;
        this._centerY = centerY;
        this._sigma = sigma;
        this._amplitude = amplitude;
    }

    apply(field) {
        const sigma2 = this._sigma * this._sigma;
        for (let i = this._centerX - 5; i <= this._centerX + 5; i++)
            for (let j = this._centerY - 5; j <= this._centerY + 5; j++) {
                if (i < 0 || j < 0 || i >= field.nx || j >= field.ny)
                    continue;

                const dx = i - this._centerX;
                const dy = j - this._centerY;
                const value = this._amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma2));
                field.setValueAt(i, j, field.valueAt(i, j) + value);
            }
        }
}

const field = new DiscreteScalarField({ nx: 256, ny: 256 });
const equation = new WaveEquation({ velocity: 10 });

const solver = new WaveEquationSolver(field, equation);
field.apply(new GaussianImpulse());
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
    normalizer: new Interval(-2, 2),
    colorMapper: ColorMappers.WaterAlternative
});

renderer.frameSceneOn(water, {padding: 175, translationY: -400});

const simulation = Simulation
    .with(renderer)
    .synchronize(surface.alwaysWith(water))
    .onClockTick(() => {
        solver.step(0.02);
        if (Math.random() < 0.02)
            field.apply(new GaussianImpulse( {
                centerX: Math.floor(Math.random() * 256),
                centerY: Math.floor(Math.random() * 256),
                amplitude:.2}));
    }, 5)
    .start();