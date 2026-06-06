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
        const dt2 = dt * dt;
        const damping = 1 - gamma * dt;
        for (let i = 1; i < nx - 1; i++)
            for (let j = 1; j < ny - 1; j++) {
                const index = i + this._field.nx * j;
                const acceleration = this._equation.acceleration(this._field, i, j);
                const velocity = current[index] - previous[index];
                next[index] = current[index] + damping * velocity + dt2 * acceleration;
            }

        this._previous = current.slice();
        current.set(next);
    }
}