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

        this._previous.set(current);
        current.set(next);
    }
}

/**
 * The solver works with the wavefunction arrays.
 * Note that times are staggered, with the imaginary parts always
 * one time step behind the corresponding real parts.  This is admittedly confusing.
 * Also note that these are 1D arrays, with index i = y*xMax + x, for efficiency.
 */
 export class SchrodingerSolver {
    constructor(psi, potential) {
        this._psi = psi;
        this._potential = potential;

        this._nextRe = new Float32Array(psi.nx * psi.ny);
        this._nextIm = new Float32Array(psi.nx * psi.ny);
    }

    // Bump the imaginary part of psi back by one time step
    initialize(dt) {
        const re = this._psi.real;
        const im = this._psi.imag;
        const V = this._potential;
        const w = this._psi.nx;

        for (let x = 1; x < w - 1; x++)
            for (let y = 1; y < w - 1; y++) {
                const i = x * w + y;
                im[i] += 0.5 * dt * (-re[i + 1] -re[i - 1] -re[i + w] -re[i - w] + 2 * (2 + V.valueAt(y,x)) * re[i]);
            }
    }

    // Integrate the TDSE for a double time step (centered-difference time integration):
    // (Remember that psi.im is one time step earlier than psi.re; same for psiNext.im and psiNext.re.)
    step(dt) {
        const re = this._psi.real;
        const im = this._psi.imag;

        const reNext = this._nextRe;
        const imNext = this._nextIm;

        const V = this._potential.data;
        const w = this._psi.nx;
        for (let x= 1; x < w - 1; x++)
            for (let y = 1; y < w - 1; y++) {
                const i = y * w + x;
                imNext[i] = im[i] - dt * (-re[i+1] - re[i-1] - re[i+w] - re[i-w] + 2*(2+V[i])*re[i]);
            }

        for (let x= 1; x < w - 1; x++)
            for (let y = 1; y < w - 1; y++) {
                const i = y * w + x;
                reNext[i] = re[i] + dt * (-imNext[i+1] - imNext[i-1] - imNext[i+w] - imNext[i-w] + 2*(2+V[i])*imNext[i]);
            }

        [this._psi.real, this._nextRe] = [this._nextRe, this._psi.real];
        [this._psi.imag, this._nextIm] = [this._nextIm, this._psi.imag];
    }
}