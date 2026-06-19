export class WaveEquationSolver {
    constructor(equation) {
        this._equation = equation;
        this._previous = null;
        this._next = null;
    }

    reset() {
        this._previous.fill(0);
        this._next.fill(0);
    }

    step(field, dt) {
        const nx = field.nx;
        const ny = field.ny;

        this._previous = this._previous === null ? new Float32Array(nx * ny) : this._previous;
        this._next = this._next === null ? new Float32Array(nx * ny) : this._next;
        const previous = this._previous;
        const next = this._next;

        const gamma = this._equation.damping;
        const dt2 = dt * dt;
        const damping = 1 - gamma * dt;
        for (let i = 1; i < nx - 1; i++)
            for (let j = 1; j < ny - 1; j++) {
                const index = i + field.nx * j;
                const acceleration = this._equation.acceleration(field, i, j);
                const velocity = field.valueAt(i, j) - previous[index];
                next[index] = field.valueAt(i, j) + damping * velocity + dt2 * acceleration;
            }

        this._previous.set(field.data);
        field.data.set(next);
    }
}

/**
 * The solver works with the wavefunction arrays.
 * Note that times are staggered, with the imaginary parts always
 * one time step behind the corresponding real parts.  This is admittedly confusing.
 * Also note that these are 1D arrays, with index i = y*xMax + x, for efficiency.
 */
 export class SchrodingerSolver {
    constructor(potential) {
        this._potential = potential;

        this._nextRe = null;
        this._nextIm = null;
    }

    reset() {
        this._nextRe.fill(0);
        this._nextIm.fill(0);
    }

    // Bump the imaginary part of psi back by one time step
    initialize(psi, dt) {
        const re = psi.real;
        const im = psi.imag;
        const V = this._potential.data;
        const w = psi.nx;

        for (let x = 1; x < w - 1; x++)
            for (let y = 1; y < w - 1; y++) {
                const i = y * w + x;
                im[i] += 0.5 * dt * (-re[i + 1] -re[i - 1] -re[i + w] -re[i - w] + 2 * (2 + V[i]) * re[i]);
            }
    }

    // Integrate the TDSE for a double time step (centered-difference time integration):
    // (Remember that psi.im is one time step earlier than psi.re; same for psiNext.im and psiNext.re.)
    step(psi, dt) {
        const w = psi.nx;
        const re = psi.real;
        const im = psi.imag;

        this._nextRe = this._nextRe === null ? new Float32Array(psi.nx * psi.ny) : this._nextRe;
        this._nextIm = this._nextIm === null ? new Float32Array(psi.nx * psi.ny) : this._nextIm;
        const reNext = this._nextRe;
        const imNext = this._nextIm;

        const V = this._potential.data;
        for (let x= 1; x < psi.nx - 1; x++)
            for (let y = 1; y < psi.ny - 1; y++) {
                const i = y * w + x;
                imNext[i] = im[i] - dt * (-re[i+1] - re[i-1] - re[i+w] - re[i-w] + 2 * (2 + V[i]) * re[i]);
            }

        for (let x= 1; x < w - 1; x++)
            for (let y = 1; y < w - 1; y++) {
                const i = y * w + x;
                reNext[i] = re[i] + dt * (-imNext[i+1] - imNext[i-1] - imNext[i+w] - imNext[i-w] + 2*(2+V[i])*imNext[i]);
            }

        [psi.real, this._nextRe] = [this._nextRe, psi.real];
        [psi.imag, this._nextIm] = [this._nextIm, psi.imag];
    }
}