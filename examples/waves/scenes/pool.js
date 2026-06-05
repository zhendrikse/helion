import {DiscreteScalarField} from "../../../src/index.js";

export class LaplaceOperator {
    apply(field, i, j) {
        return (
            field.valueAt(i + 1, j) +
            field.valueAt(i - 1, j) +
            field.valueAt(i, j + 1) +
            field.valueAt(i, j - 1) -
            4 * field.valueAt(i, j)
        );
    }
}

export class WaveEquation {
    constructor({
        velocity = 1
    } = {}) {
        this._velocity = velocity;
    }

    acceleration(field, laplacian, i, j) {
        return this._velocity * this._velocity * laplacian.apply(field, i, j);
    }
}

export class WaveEquationSolver {
    constructor(field, equation) {
        this._field = field;
        this._equation = equation;

        const N = field.nx * field.ny;

        this._previous = new Float32Array(N);
        this._next = new Float32Array(N);

        this._laplacian = new LaplaceOperator();
    }

    step(dt) {
    ...
    }

    update() {
        for (let i = 1; i < nx - 1; i++)
            for (let j = 1; j < ny - 1; j++) {
                const u = field.valueAt(i,j);
                const lap = this._laplacian.apply(field,i,j);
                next[i, j] = 2*u - previous[i, j] +  dt*dt* equation.acceleration(field, this._laplacian, i, j);
            }
    }
}

const field = new DiscreteScalarField({
    nx: 256,
    ny: 256
});

const waveEquation = new WaveEquation({
    velocity: 2
});

const solver = new WaveEquationSolver(
    field,
    waveEquation
);

const surface = new ScalarFieldSurface(field);

const simulation = Simulation.with()
    .synchronize(surface.alwaysWith(
        new SurfaceWithContoursView()
    ))
    .onClockTick(() => {
        solver.step(0.01);
    });