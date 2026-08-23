import {Complex} from "../../math.js";

export class WaveEquationSolver {
    constructor(equation) {
        this._equation = equation;
        this._previous = null;
        this._next = null;
    }

    reset() {
        this._previous?.fill(0);
        this._next?.fill(0);
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
        this._nextRe?.fill(0);
        this._nextIm?.fill(0);
    }

    // Bump the imaginary part of psi back by one time step
    initialize(psi, dt) {
        const re = psi.real;
        const im = psi.imag;
        const V = this._potential.data;
        const w = psi.nx;

        for (let x = 1; x < psi.nx - 1; x++)
            for (let y = 1; y < psi.ny - 1; y++) {
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

export class WaveFunctionEigenStateSolver {
    static hbar = 1;
    static mass = 1;

    constructor({
        size = 20,
        spacing = 10
    } = {}) {

        this._eigenstates = {};
        this._coefs = {}
        this._omegas = {}
        this._omega0 = WaveFunctionEigenStateSolver.hbar * Math.PI * Math.PI /
            (2 * WaveFunctionEigenStateSolver.mass * spacing * spacing);
        this._size = size;
        this._time = 0;

        const NA2 = Math.floor(size / 2); // Number of atoms divided by two
        this._computeEigenstates(spacing, NA2);
        this._computeCoefficients(this._computePsi0(NA2), NA2);
    }

    _updatePsiValueAt(psi, i, j) {
        let updatedPsi = new Complex(0, 0);
        for (let key in this._eigenstates) {
            const basis = this._eigenstates[key][i][j]
            const term = Complex.fromPhase(this._omegas[key] * this._time);
            term.multiply(new Complex(this._coefs[key] * basis, 0));
            updatedPsi.add(term);
        }
        psi.real[psi.index(i, j)] = updatedPsi.re;
        psi.imag[psi.index(i, j)] = updatedPsi.im;
    }

    _computePsi0(NA2) {
        const psi0 = [];
        let norm0 = 0;

        for (let i = 0; i < this._size; i++) {
            psi0[i] = [];
            for (let j = 0; j < this._size; j++) {
                const val = (i < NA2 && j < NA2) ? 1 : 0;
                psi0[i][j] = val;
                norm0 += val * val;
            }
        }

        this._normalize(psi0, norm0);
        return psi0;
    }

    _computeCoefficients(psi0, NA2) {
        for (let key in this._eigenstates) {
            const [nx, ny] = key.split(",").map(Number)
            const basis = this._eigenstates[key]

            let c = 0
            for (let i = 0; i < NA2; i++)
                for (let j = 0; j < NA2; j++)
                    c += psi0[i][j] * basis[i][j];

            this._coefs[key] = c;
            this._omegas[key] = this._omega0 * (nx * nx + ny * ny);
        }
    }

    _normalize(psi, norm) {
        const norm0 = Math.sqrt(norm)
        for (let i = 0; i < this._size; i++)
            for (let j = 0; j < this._size; j++)
                psi[i][j] /= norm0;

        return psi;
    }

    _computeEigenstate(nx, ny, spacing) {
        const psi = [];
        let norm = 0;

        for (let i = 0; i < this._size; i++) {
            psi[i] = [];
            const x = spacing * i / (this._size - 1);

            for (let j = 0; j < this._size; j++) {
                const y = spacing * j / (this._size - 1);
                const val = Math.sin(nx * Math.PI * x / spacing) * Math.sin(ny * Math.PI * y / spacing);
                psi[i][j] = val;
                norm += val * val;
            }
        }

        this._normalize(psi, norm);
        return psi;
    }

    _computeEigenstates(spacing, NA2) {
        for (let nx = 1; nx <= NA2; nx++)
            for (let ny = 1; ny <= NA2; ny++)
                this._eigenstates[nx + "," + ny] = this._computeEigenstate(nx, ny, spacing);
    }

    step(psi, dt) {
        this._time += dt;
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++)
                this._updatePsiValueAt(psi, i, j);
    }
}
