import { DiscreteComplexField, DiscreteScalarField } from '../../fields.js';
import {Complex} from '../../math.js';
import {Solver} from './solvers.js';

/**
 * The solver works with the wavefunction arrays.
 * Note that times are staggered, with the imaginary parts always
 * one time step behind the corresponding real parts.  This is admittedly confusing.
 * Also note that these are 1D arrays, with index i = y*xMax + x, for efficiency.
 */
export class SchrodingerEigenstateSolver extends Solver {
    /**
     * @param {{
     * potential?: DiscreteScalarField
     * spacing?: number
     * hbar?: number
     * mass?: number
     * states?: number
     * iterations?: number
     * }} param0 
     */
    constructor({
        potential = new DiscreteScalarField(),
        spacing = 1,
        hbar = 1,
        mass = 1,
        states = 4,
        iterations = 1200
    } = {}) {
        super();
        /**@type {Float64Array[]} */
        this._eigenstates = [];
        /**  @type {number[]} */
        this._eigenvalues = [];
        this._potential = potential;
        this._spacing = spacing;
        this._hbar = hbar;
        this._mass = mass;
        this._states = states;
        this._iterations = iterations;
        this.reset();
    }

    get states() { return this._states; }
    get stateCount() { return this._eigenstates.length; }

    /** @param {number} index */
    eigenstateAt(index) {
        if (index < 0 || index >= this._eigenstates.length)
            throw new RangeError(`Eigenstate index out of range: ${index}`);
        return this._eigenstates[index];
    }

    reset() {
        this._eigenvalues = [];
        this._eigenstates = [];
    }

    /**
     * @param {number} state
     * @param {DiscreteComplexField} waveFunction
     * @param {number} dt
     */
    _createEigenState(state, waveFunction, dt) {
        const nx = waveFunction.nx;
        const ny = waveFunction.ny;
        const size = nx * ny;
        let psi = new Float64Array(size);

        for (let y = 1; y < ny - 1; y++) {
            const v = y / (ny - 1);
            for (let x = 1; x < nx - 1; x++) {
                const u = x / (nx - 1);
                psi[waveFunction.index(x, y)] = Math.sin((state + 1) * Math.PI * u) * Math.sin(Math.PI * v);
            }
        }

        this._orthogonalize(psi);
        this._normalize(psi);

        for (let iteration = 0; iteration < this._iterations; iteration++) {
            const hPsi = this._applyHamiltonian(psi);
            const next = new Float64Array(size);

            for (let i = 0; i < size; i++)
                next[i] = psi[i] - dt * hPsi[i];

            this._orthogonalize(next);
            this._normalize(next);
            psi = next;
        }

        const energy = this._rayleighQuotient(psi);
        this._eigenvalues.push(energy);
        this._eigenstates.push(psi);
    }

    /**
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
    initialize(psi, dt=0.01) {
        this.reset();
        if (this._potential.nx !== psi.nx || this._potential.ny !== psi.ny)
            throw new Error(`Schrödinger potential (${this._potential.nx} x ${this._potential.nx}) ` +
                `and wavefunction psi (${psi.nx} x ${psi.ny}) grids must have the same dimensions.`);

        for (let state = 0; state < this._states; state++)
            this._createEigenState(state, psi, dt);
        return this;
    }

    /**  @param {Float64Array<ArrayBuffer>} psi */
    _applyHamiltonian(psi) {
        const nx = this._potential.nx;
        const ny = this._potential.ny;
        const h2 = this._spacing * this._spacing;
        const kinetic = this._hbar * this._hbar / (2 * this._mass);
        const hPsi = new Float64Array(nx * ny);

        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                const laplacian =
                    (psi[i - 1] + psi[i + 1] + psi[i - nx] + psi[i + nx] - 4 * psi[i]) / h2;

                hPsi[i] = -kinetic * laplacian + this._potential.data[i] * psi[i];
            }

        return hPsi;
    }

    /** @param {Float64Array<ArrayBuffer>} psi */
    _orthogonalize(psi) {
        for (const state of this._eigenstates) {
            let projection = 0;

            for (let i = 0; i < psi.length; i++)
                projection += psi[i] * state[i];

            for (let i = 0; i < psi.length; i++)
                psi[i] -= projection * state[i];
        }
    }

    /**  @param {Float64Array<ArrayBuffer>} psi */
    _normalize(psi) {
        let normSquared = 0;

        for (const value of psi)
            normSquared += value * value;

        const norm = Math.sqrt(normSquared);
        if (norm === 0)
            throw new Error('SchrodingerEigenstateSolver produced a zero state.');

        for (let i = 0; i < psi.length; i++)
            psi[i] /= norm;
    }

    /** @param {Float64Array<ArrayBuffer>} psi */
    _rayleighQuotient(psi) {
        const hPsi = this._applyHamiltonian(psi);
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < psi.length; i++) {
            numerator += psi[i] * hPsi[i];
            denominator += psi[i] * psi[i];
        }

        return numerator / denominator;
    }
}

/**
 * The solver works with the wavefunction arrays.
 * Note that times are staggered, with the imaginary parts always
 * one time step behind the corresponding real parts.  This is admittedly confusing.
 * Also note that these are 1D arrays, with index i = y*xMax + x, for efficiency.
 */
export class SchrodingerSolver extends Solver {
    /**
     * @param {{ potential?: DiscreteScalarField }} param0 
     */
    constructor({
        potential = new DiscreteScalarField()
    }) {
        super();
        this._potential = potential;

        this._nextRe = null;
        this._nextIm = null;
    }

    reset() {
        this._nextRe?.fill(0);
        this._nextIm?.fill(0);
    }

    /**
     * Bump the imaginary part of psi back by one time step.
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
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

    /**
     * Integrate the TDSE for a double time step (centered-difference time integration).
     * (Remember that psi.im is one time step earlier than psi.re; same for psiNext.im and psiNext.re.)
     *
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
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

export class WaveFunctionEigenStateSolver extends Solver {
    static hbar = 1;
    static mass = 1;

    /**
     * @param {{
     * spacing?: number
     * size?: number
     * }} param0 
     */
    constructor({
        size = 20,
        spacing = 10
    } = {}) {
        super();
        /** @type {Object.<string, number[][]>} */
        this._eigenstates = {};
        /** @type {Object.<string, number>} */
        this._coefs = {}
        /** @type {Object.<string, number>} */
        this._omegas = {}
        this._omega0 = WaveFunctionEigenStateSolver.hbar * Math.PI * Math.PI /
            (2 * WaveFunctionEigenStateSolver.mass * spacing * spacing);
        this._size = size;
        this._time = 0;

        const NA2 = Math.floor(size / 2); // Number of atoms divided by two
        this._computeEigenstates(spacing, NA2);
        this._computeCoefficients(this._computePsi0(NA2), NA2);
    }

    /**
     * @param {DiscreteComplexField} psi
     * @param {number} i
     * @param {number} j
     */
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

    /** @param {number} NA2 */
    _computePsi0(NA2) {
        /** @type {number[][]} */
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

    /**
     * @param {number[][]} psi0
     * @param {number} NA2
     */
    _computeCoefficients(psi0, NA2) {
        for (let key in this._eigenstates) {
            const [nx, ny] = key.split(',').map(Number)
            const basis = this._eigenstates[key]

            let c = 0
            for (let i = 0; i < NA2; i++)
                for (let j = 0; j < NA2; j++)
                    c += psi0[i][j] * basis[i][j];

            this._coefs[key] = c;
            this._omegas[key] = this._omega0 * (nx * nx + ny * ny);
        }
    }

    /**
     * @param {number[][]} psi
     * @param {number} norm
     */
    _normalize(psi, norm) {
        const norm0 = Math.sqrt(norm)
        for (let i = 0; i < this._size; i++)
            for (let j = 0; j < this._size; j++)
                psi[i][j] /= norm0;

        return psi;
    }

    /**
     * @param {number} nx
     * @param {number} ny
     * @param {number} spacing
     */
    _computeEigenstate(nx, ny, spacing) {
        /** @type {number[][]} */
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

    /**
     * @param {number} spacing
     * @param {number} NA2
     */
    _computeEigenstates(spacing, NA2) {
        for (let nx = 1; nx <= NA2; nx++)
            for (let ny = 1; ny <= NA2; ny++)
                this._eigenstates[nx + ',' + ny] = this._computeEigenstate(nx, ny, spacing);
    }

    /**
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
    step(psi, dt) {
        this._time += dt;
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++)
                this._updatePsiValueAt(psi, i, j);
    }
}
