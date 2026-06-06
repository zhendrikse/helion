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
        return this._velocity * this._velocity * LaplaceOperator.apply(field, i, j);
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
    apply(field, cx, cy, amplitude = 1, sigma = 5) {
        for (let i = cx - 5; i <= cx + 5; i++)
            for (let j = cy - 5; j <= cy + 5; j++) {
                if (i < 0 || j < 0 || i >= field.nx || j >= field.ny)
                    continue;

                const dx = i - cx;
                const dy = j - cy;
                const value = amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                field.setValueAt(i, j, field.valueAt(i, j) + value);
            }
        }
}

const field = new DiscreteScalarField({ nx: 256, ny: 256 });
const equation = new WaveEquation({ velocity: 10 });

const solver = new WaveEquationSolver(field, equation);
const rain = new GaussianImpulse();
rain.apply(field, 128, 128, .2);
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
    colorMapper: ColorMappers.WaterAlternative,
    normalizer: new Interval(-2, 2)
});

renderer.frameSceneOn(water, {padding: 175, translationY: -400});

const simulation = Simulation
    .with(renderer)
    .synchronize(surface.alwaysWith(water))
    .onClockTick(() => {
        solver.step(0.02);
        if (Math.random() < 0.02)
            rain.apply(field, Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), .2);
    }, 5)
    .start();