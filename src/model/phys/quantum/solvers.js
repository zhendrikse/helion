import { Solver } from '../../math/numerics/solvers/solvers.js';
import { Hamiltonian } from './hamiltonian.js';
import { WaveFunction } from './wavefunction.js';
import { VecN } from '../../math/objects.js';
import { DiscreteComplexField } from '../../math/fields.js';

/**
 * Time-dependent Schrödinger solver for a two-dimensional Hamiltonian.
 *
 * The solver deliberately knows nothing about how the potential is defined.
 * It only asks the Hamiltonian to apply itself to a real-valued component.
 */
export class SchrodingerSolver extends Solver {
    /**
     * @param {{
     *     hamiltonian?: Hamiltonian
     * }} param0
     */
    constructor({ hamiltonian } = {}) {
        super();
        if (!hamiltonian)
            throw new TypeError('SchrodingerSolver requires a Hamiltonian.');

        this._hamiltonian = hamiltonian;
        /** @type {Float64Array<ArrayBuffer>} */
        this._nextRe = new Float64Array();
        /** @type {Float64Array<ArrayBuffer>} */
        this._nextIm = new Float64Array();
        this._initialized = false;
    }

    get hamiltonian() { return this._hamiltonian; }
    get initialized() { return this._initialized; }

    reset() {
        this._initialized = false;
        this._nextRe?.fill(0);
        this._nextIm?.fill(0);
    }

    /**
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
    initialize(psi, dt) {
        this._validateWaveFunction(psi);
        this._ensureBuffers(psi);

        // Keep the historical staggered-time initialization. The first
        // imaginary component is half a step behind the real component.
        const hRe = this._hamiltonian.apply(psi.real);
        const nx = psi.nx;
        const ny = psi.ny;

        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                psi.imag[i] += 0.5 * dt * hRe[i];
            }

        this._initialized = true;
        return this;
    }

    /**
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
    step(psi, dt) {
        this._validateWaveFunction(psi);
        this._ensureBuffers(psi);
        if (!this._initialized)
            this.initialize(psi, dt);

        const re = psi.real;
        const im = psi.imag;
        const reNext = this._nextRe;
        const imNext = this._nextIm;
        const nx = psi.nx;
        const ny = psi.ny;

        // This is the original centered-difference/leapfrog scheme.
        // Do not replace the second Hamiltonian application with H(im):
        // imNext is intentionally the staggered time level.
        const hRe = this._hamiltonian.apply(re);
        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                imNext[i] = im[i] - dt * hRe[i];
            }

        const hImNext = this._hamiltonian.apply(imNext);
        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                reNext[i] = re[i] + dt * hImNext[i];
            }

        [psi.real, this._nextRe] = [this._nextRe, psi.real];
        [psi.imag, this._nextIm] = [this._nextIm, psi.imag];
    }

    /** @param {DiscreteComplexField} psi */
    _ensureBuffers(psi) {
        const size = psi.nx * psi.ny;
        if (!this._nextRe || this._nextRe.length !== size) {
            this._nextRe = new Float64Array(size);
            this._nextIm = new Float64Array(size);
        }
    }

    /** @param {DiscreteComplexField} psi */
    _validateWaveFunction(psi) {
        if (!(psi instanceof DiscreteComplexField))
            throw new TypeError('SchrodingerSolver requires a DiscreteComplexField.');
        if (psi.nx !== this._hamiltonian.N || psi.ny !== this._hamiltonian.N)
            throw new Error('Hamiltonian and wavefunction grids must have the same dimensions.');
    }
}

/**
 * Matrix-free Lanczos eigensolver for a real symmetric Hamiltonian.
 *
 * The solver only requires an operator that maps a vector to H * vector.
 * This keeps the Hamiltonian matrix implicit, which is important for the
 * large grids used by the quantum visualizations.
 */
export class LanczosEigenstateSolver extends Solver {
    /**
     * @param {{
     *     hamiltonian?: Hamiltonian,
     *     states?: number,
     *     iterations?: number,
     *     calculateResiduals?: boolean
     * }} param0
     */
    constructor({
        hamiltonian,
        states = 4,
        iterations = 100,
        calculateResiduals = false
    } = {}) {
        super();

        if (!hamiltonian)
            throw new TypeError('LanczosEigenstateSolver requires a Hamiltonian.');

        if (!Number.isInteger(states) || states < 1)
            throw new RangeError('LanczosEigenstateSolver states must be a positive integer.');

        this._hamiltonian = hamiltonian;
        this._states = states;
        this._iterations = iterations;
        this._calculateResiduals = calculateResiduals;
    }

    /**
     * @param {Float64Array<ArrayBuffer>} psi
     * @param {number} state
     * @param {number[]} residuals
     */
    _calculateResidualsFor(psi, state, residuals) {
        const hPsi = this._hamiltonian.apply(psi);
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < psi.length; i++) {
            numerator += psi[i] * hPsi[i];
            denominator += psi[i] * psi[i];
        }

        const energy = numerator / denominator;
        let residualSquared = 0;

        for (let i = 0; i < psi.length; i++) {
            const residual = hPsi[i] - energy * psi[i];
            residualSquared += residual * residual;
        }

        residuals[state] = Math.sqrt(residualSquared / denominator);
    }

    /**
     * Cooperative asynchronous variant of solve().
     *
     * @param {WaveFunction} waveFunction
     * @param {(text: string, percent: number) => void} progressCallback
     * @returns {Promise<number[]>} an array with residuals for each eigenvalue
     */
    async solveAsync(waveFunction, progressCallback) {
        const { basis, diagonal, offDiagonal } = await this._buildKrylovSubspaceAsync(progressCallback);
        const { values, vectors } = await this._diagonalizeTridiagonal(diagonal, offDiagonal, progressCallback);

        const count = Math.min(this._states, values.length);
        const residuals = new Array(count)

        for (let state = 0; state < count; state++) {
            const psi = this._ritzVector(basis, vectors, state);
            VecN.normalize(psi);
            if (this._calculateResiduals)
                this._calculateResidualsFor(psi, state, residuals);
            waveFunction.addEigenstate(psi, new Float64Array(psi.length), this._hamiltonian.energyOf(psi));
        }

        return residuals;
    }

    _iterationCount() {
        const dimension = this._hamiltonian.N * this._hamiltonian.N;
        const defaultIterations = Math.max(30, this._states * 4 + 20);
        const requested = this._iterations ?? defaultIterations;
        return Math.min(Math.max(this._states + 2, requested), dimension);
    }

    /** @param {((text: string, percent: number) => void)} progressCallback */
    async _buildKrylovSubspaceAsync(progressCallback) {
        const size = this._hamiltonian.N * this._hamiltonian.N;
        const count = this._iterationCount();
        /** @type {Float64Array<ArrayBuffer>[]} */
        const basis = [];
        /** @type {number[]} */
        const diagonal = [];
        /** @type {number[]} */
        const offDiagonal = [];

        let q = this._initialVector(size);
        VecN.normalize(q);

        let previous = null;
        let beta = 0;
        const z = new Float64Array(size);

        for (let step = 0; step < count; step++) {
            this._hamiltonian.apply(q, z);

            if (step !== 0)
                for (let i = 0; i < size; i++)
                    z[i] -= beta * previous[i];

            const alpha = VecN.dot(q, z);
            diagonal.push(alpha);

            for (let i = 0; i < size; i++)
                z[i] -= alpha * q[i];

            VecN.reorthogonalize(z, basis);
            basis.push(q);

            beta = VecN.norm(z);
            if (beta < 1e-12 || step === count - 1)
                break;

            offDiagonal.push(beta);
            previous = q;
            q = z.slice();
            VecN.scale(q, 1 / beta);

            if (step % 50 === 0) {
                progressCallback?.('Solving Hamiltonian', 100 * (step + 1) / count);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        return { basis, diagonal, offDiagonal };
    }

    /** @param {number} size */
    _initialVector(size) {
        // A deterministic, non-symmetric seed prevents the initial Krylov
        // vector from accidentally excluding parts of degenerate eigenspaces.
        const psi = new Float64Array(size);
        let seed = 0x12345678;

        for (let i = 0; i < size; i++) {
            seed = (1664525 * seed + 1013904223) >>> 0;
            psi[i] = (seed / 0x100000000) - 0.5;
        }

        // Respect the same zero boundary convention as Hamiltonian.apply().
        const n = this._hamiltonian.N;
        for (let x = 0; x < n; x++) {
            psi[x] = 0;
            psi[(n - 1) * n + x] = 0;
            psi[x * n] = 0;
            psi[x * n + n - 1] = 0;
        }

        return psi;
    }

    /**
     * @param {string | any[]} basis
     * @param {Float64Array<any>[]} eigenvectors
     * @param {number} column
     */
    _ritzVector(basis, eigenvectors, column) {
        const size = basis[0].length;
        const psi = new Float64Array(size);

        for (let j = 0; j < basis.length; j++) {
            const coefficient = eigenvectors[j][column];
            const q = basis[j];

            for (let i = 0; i < size; i++)
                psi[i] += coefficient * q[i];
        }

        return psi;
    }

    /**
     * Jacobi diagonalization of the small symmetric tridiagonal matrix.
     * The Krylov matrix is at most O(states) in size, so this dense step is
     * inexpensive compared with the Hamiltonian applications.
     * @param {number[]} diagonal
     * @param {number[]} offDiagonal
     * @param {(text: string, percent: number) => void} progressCallback
     */
    async _diagonalizeTridiagonal(diagonal, offDiagonal, progressCallback) {
        const n = diagonal.length;
        const d = Float64Array.from(diagonal);
        const e = new Float64Array(n);

        for (let i = 0; i < n - 1; i++)
            e[i] = offDiagonal[i];

        // QL algorithm for a symmetric tridiagonal matrix.
        // Unlike the previous dense Jacobi implementation, this works
        // directly on the tridiagonal representation and costs O(n²).
        const vectors = Array.from(
            { length: n },
            (_, row) => {
                const values = new Float64Array(n);
                values[row] = 1;
                return values;
            }
        );

        for (let l = 0; l < n; l++) {
            if (l % 50 === 0) {
                progressCallback?.('Final diagonalization', 100 * (l + 1) / n);
                await new Promise(r => setTimeout(r, 0));
            }
            let iteration = 0;

            while (true) {
                let m = l;
                while (m < n - 1) {
                    const dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
                    if (Math.abs(e[m]) <= Number.EPSILON * dd)
                        break;
                    m++;
                }

                if (m === l)
                    break;

                if (++iteration > 100)
                    throw new Error('Lanczos tridiagonal eigensolver did not converge.');

                let g = (d[l + 1] - d[l]) / (2 * e[l]);
                let r = Math.hypot(g, 1);
                g = d[m] - d[l] + e[l] / (g + Math.sign(g || 1) * r);

                let s = 1;
                let c = 1;
                let p = 0;

                for (let i = m - 1; i >= l; i--) {
                    const f = s * e[i];
                    const b = c * e[i];
                    r = Math.hypot(f, g);
                    e[i + 1] = r;

                    if (r === 0) {
                        d[i + 1] -= p;
                        e[m] = 0;
                        break;
                    }

                    s = f / r;
                    c = g / r;
                    g = d[i + 1] - p;
                    r = (d[i] - g) * s + 2 * c * b;
                    p = s * r;
                    d[i + 1] = g + p;
                    g = c * r - b;

                    for (let row = 0; row < n; row++) {
                        const z1 = vectors[row][i + 1];
                        const z2 = vectors[row][i];
                        vectors[row][i + 1] = s * z2 + c * z1;
                        vectors[row][i] = c * z2 - s * z1;
                    }
                }

                if (r === 0 && e[m] === 0)
                    continue;

                d[l] -= p;
                e[l] = g;
                e[m] = 0;
            }
        }

        const eigenpairs = Array.from({ length: n }, (_, index) => ({
            value: d[index],
            vector: vectors.map(row => row[index])
        })).sort((a, b) => a.value - b.value);

        const sortedVectors = Array.from(
            { length: n },
            () => new Float64Array(n)
        );

        for (let state = 0; state < n; state++)
            for (let basisIndex = 0; basisIndex < n; basisIndex++)
                sortedVectors[basisIndex][state] = eigenpairs[state].vector[basisIndex];

        return {
            values: eigenpairs.map(pair => pair.value),
            vectors: sortedVectors
        };
    }
}

/**
 * Reference solver, based on the relaxation algorithm by Daniel Schroeder:
 * https://physics.weber.edu/schroeder/software/BoundStates2D.html
 *
 * It performs much less well than the Lanczos solver when applied to
 * larger grids and larger number of eigenstates. We keep it here for
 * reference purposes only.
 */
export class RelaxationEigenstateSolver extends Solver {
    /**
     * @param {{
     *     hamiltonian?: Hamiltonian,
     *     states?: number,
     *     iterations?: number,
     *     stepSize?: number,
     *     tolerance?: number,
     *     calculateResiduals?: boolean
     * }} options
     */
    constructor({
        hamiltonian,
        states = 4,
        iterations = 1000,
        stepSize = 1e-4,
        tolerance = 1e-10,
        calculateResiduals = false
    } = {}) {
        super();
        if (!hamiltonian)
            throw new TypeError('RelaxationEigenstateSolver requires a Hamiltonian.');
        if (!Number.isInteger(states) || states < 1)
            throw new RangeError('RelaxationEigenstateSolver states must be a positive integer.');
        if (!Number.isInteger(iterations) || iterations < 1)
            throw new RangeError('RelaxationEigenstateSolver iterations must be a positive integer.');
        if (!(stepSize > 0))
            throw new RangeError('RelaxationEigenstateSolver stepSize must be greater than zero.');
        if (!(tolerance > 0))
            throw new RangeError('RelaxationEigenstateSolver tolerance must be greater than zero.');

        this._hamiltonian = hamiltonian;
        this._states = states;
        this._iterations = iterations;
        this._stepSize = stepSize;
        this._tolerance = tolerance;
        this._calculateResiduals = calculateResiduals;
    }

    /**
     * @param {WaveFunction} waveFunction
     * @param {(text:string, percent:number)=>void} [progressCallback]
     */
    async solveAsync(waveFunction, progressCallback) {
        const size = this._hamiltonian.N * this._hamiltonian.N;
        const count = Math.min(this._states, size);
        const residuals = new Array(count);
        /** @type {Float64Array<ArrayBuffer>[]} */
        const states = [];

        for (let state = 0; state < count; state++) {
            const psi = this._initialVector(size, state);
            await this._relax(psi, states, progressCallback, state, count);
            const energy = this._hamiltonian.energyOf(psi);

            this._removeComponents(psi, states);
            VecN.normalize(psi);
            states.push(psi);

            if (this._calculateResiduals)
                residuals[state] = this._residual(psi, energy);

            waveFunction.addEigenstate(psi, new Float64Array(size), energy);
            progressCallback?.(`Relaxing eigenstate ${state + 1}/${count}`, 100 * (state + 1) / count);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        return residuals;
    }

    /**
     * @param {Float64Array<any>} psi
     * @param {Float64Array<ArrayBuffer>[]} previousStates
     * @param {(text: string, percent: number) => void} progressCallback
     * @param {number} state
     * @param {number} stateCount
     */
    async _relax(psi, previousStates, progressCallback, state, stateCount) {
        const hPsi = new Float64Array(psi.length);
        const gradient = new Float64Array(psi.length);
        const work = new Float64Array(psi.length);
        let energy = this._hamiltonian.energyOf(psi);

        for (let iteration = 0; iteration < this._iterations; iteration++) {
            this._hamiltonian.apply(psi, hPsi);
            for (let i = 0; i < psi.length; i++)
                gradient[i] = hPsi[i] - energy * psi[i];

            this._removeComponents(gradient, previousStates);
            const gradientNorm = VecN.norm(gradient);
            if (gradientNorm < this._tolerance)
                return iteration + 1;

            for (let i = 0; i < psi.length; i++)
                work[i] = psi[i] - this._stepSize * gradient[i];

            this._removeComponents(work, previousStates);
            VecN.normalize(work);
            psi.set(work);
            energy = this._hamiltonian.energyOf(psi);

            if (iteration % 50 === 0) {
                const completed = (state * this._iterations + iteration + 1) /
                    (stateCount * this._iterations);
                progressCallback?.('Relaxing Hamiltonian', 100 * completed);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        return this._iterations;
    }

    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @param {Float64Array<ArrayBuffer>[]} states
     */
    _removeComponents(vector, states) {
        for (const state of states) {
            const projection = VecN.dot(vector, state);
            for (let i = 0; i < vector.length; i++)
                vector[i] -= projection * state[i];
        }
    }

    /**
     * @param {number} size
     * @param {number} state
     */
    _initialVector(size, state) {
        const psi = new Float64Array(size);
        let seed = (0x12345678 + state * 0x9e3779b9) >>> 0;
        for (let i = 0; i < size; i++) {
            seed = (1664525 * seed + 1013904223) >>> 0;
            psi[i] = seed / 0x100000000 - 0.5;
        }

        const n = this._hamiltonian.N;
        for (let x = 0; x < n; x++) {
            psi[x] = 0;
            psi[(n - 1) * n + x] = 0;
            psi[x * n] = 0;
            psi[x * n + n - 1] = 0;
        }
        VecN.normalize(psi);
        return psi;
    }

    /**
     * @param {Float64Array<ArrayBuffer>} psi
     * @param {number} energy
     */
    _residual(psi, energy) {
        const hPsi = this._hamiltonian.apply(psi);
        let squared = 0;
        for (let i = 0; i < psi.length; i++) {
            const residual = hPsi[i] - energy * psi[i];
            squared += residual * residual;
        }
        return Math.sqrt(squared);
    }
}



import { DiscreteComplexField3D, DiscreteScalarField3D } from '../../math/fields.js';

/**
 * Matrix-free 3D finite-difference Schrödinger eigenstate solver.
 *
 * This remains separate while the 2D quantum API is refactored around
 * Hamiltonian. The 3D implementation will be revisited later.
 */
export class SchrodingerEigenstateSolver3D extends Solver {
    constructor({
        hamiltonian = null,
        potential = new DiscreteScalarField3D(),
        spacing = 1,
        hbar = 1,
        mass = 1,
        states = 1,
        iterations = 400,
        dt = 0.002
    } = {}) {
        super();
        this._hamiltonian = hamiltonian ?? new Hamiltonian3D({ potential, spacing, hbar, mass });
        this._potential = this._hamiltonian.potential;
        this._states = states;
        this._iterations = iterations;
        this._dt = dt;
        this.reset();
    }

    get hamiltonian() { return this._hamiltonian; }
    get stateCount() { return this._eigenstates.length; }
    get energies() { return this._eigenvalues; }

    eigenstateAt(index) {
        if (index < 0 || index >= this._eigenstates.length)
            throw new RangeError(`Eigenstate index out of range: ${index}`);
        return this._eigenstates[index];
    }

    diagnosticsFor(index) {
        const psi = this.eigenstateAt(index);
        const energy = this._eigenvalues[index];
        const hPsi = this._hamiltonian.apply(psi);
        const { nx, ny, nz } = this._potential;
        const cx = (nx - 1) / 2;
        const cy = (ny - 1) / 2;
        const cz = (nz - 1) / 2;

        let residualSquared = 0;
        let normSquared = 0;
        let inversionOverlap = 0;
        const shellSums = new Map();
        const shellCounts = new Map();

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const i = this._index(x, y, z);
                    const difference = hPsi[i] - energy * psi[i];
                    residualSquared += difference * difference;
                    normSquared += psi[i] * psi[i];
                    inversionOverlap += psi[i] * psi[this._index(nx - 1 - x, ny - 1 - y, nz - 1 - z)];

                    const dx = x - cx;
                    const dy = y - cy;
                    const dz = z - cz;
                    const radiusSquared = dx * dx + dy * dy + dz * dz;
                    const amplitude = Math.abs(psi[i]);
                    shellSums.set(radiusSquared, (shellSums.get(radiusSquared) ?? 0) + amplitude);
                    shellCounts.set(radiusSquared, (shellCounts.get(radiusSquared) ?? 0) + 1);
                }

        let symmetrySquared = 0;
        let symmetryCount = 0;

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dz = z - cz;
                    const radiusSquared = dx * dx + dy * dy + dz * dz;
                    const mean = shellSums.get(radiusSquared) / shellCounts.get(radiusSquared);
                    const difference = Math.abs(psi[this._index(x, y, z)]) - mean;
                    symmetrySquared += difference * difference;
                    symmetryCount++;
                }

        const residual = Math.sqrt(residualSquared / normSquared);
        const radialSymmetryError = symmetryCount === 0
            ? 0
            : Math.sqrt(symmetrySquared / symmetryCount) /
            Math.max(Math.sqrt(normSquared / symmetryCount), 1e-12);
        const inversionParity = normSquared === 0 ? 0 : inversionOverlap / normSquared;

        return { energy, residual, radialSymmetryError, inversionParity };
    }

    reset() {
        this._eigenstates = [];
        this._eigenvalues = [];
    }

    initialize(psi) {
        this.reset();
        this._validateWaveFunction(psi);

        for (let state = 0; state < this._states; state++)
            this._createEigenState(state, psi);

        return this;
    }

    _createEigenState(state, psi) {
        const { nx, ny, nz } = psi;
        const psiState = new Float64Array(nx * ny * nz);
        const cx = (nx - 1) / 2;
        const cy = (ny - 1) / 2;
        const cz = (nz - 1) / 2;
        const width = this._hamiltonian.spacing * 2;

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const dx = (x - cx) * this._hamiltonian.spacing;
                    const dy = (y - cy) * this._hamiltonian.spacing;
                    const dz = (z - cz) * this._hamiltonian.spacing;
                    const r2 = dx * dx + dy * dy + dz * dz;
                    const gaussian = Math.exp(-r2 / (2 * width * width));
                    const angularFactor =
                        state === 0 ? 1 :
                            state === 1 ? dx :
                                state === 2 ? dy :
                                    dz;

                    psiState[this._index(x, y, z)] = gaussian * angularFactor;
                }

        this._orthogonalize(psiState);
        this._normalize(psiState);

        for (let iteration = 0; iteration < this._iterations; iteration++) {
            const hPsi = this._hamiltonian.apply(psiState);
            for (let i = 0; i < psiState.length; i++)
                psiState[i] -= this._dt * hPsi[i];

            this._orthogonalize(psiState);
            this._normalize(psiState);
        }

        this._eigenstates.push(psiState);
        this._eigenvalues.push(this._rayleighQuotient(psiState));
    }

    _validateWaveFunction(psi) {
        if (!(psi instanceof DiscreteComplexField3D))
            throw new TypeError('SchrodingerEigenstateSolver3D requires a DiscreteComplexField3D.');
        if (this._potential.nx !== psi.nx ||
            this._potential.ny !== psi.ny ||
            this._potential.nz !== psi.nz)
            throw new Error('Schrödinger 3D potential and wavefunction grids must have the same dimensions.');
    }

    _index(x, y, z) {
        return z * this._potential.nx * this._potential.ny + y * this._potential.nx + x;
    }

    _orthogonalize(psi) {
        for (const state of this._eigenstates) {
            let projection = 0;
            for (let i = 0; i < psi.length; i++)
                projection += psi[i] * state[i];
            for (let i = 0; i < psi.length; i++)
                psi[i] -= projection * state[i];
        }
    }

    _normalize(psi) {
        let normSquared = 0;
        for (const value of psi)
            normSquared += value * value;

        const norm = Math.sqrt(normSquared);
        if (norm === 0)
            throw new Error('SchrodingerEigenstateSolver3D produced a zero state.');

        for (let i = 0; i < psi.length; i++)
            psi[i] /= norm;
    }

    _rayleighQuotient(psi) {
        return this._hamiltonian.energyOf(psi);
    }
}

/**
 * Minimal 3D Hamiltonian kept local to the 3D solver for now. The public
 * Hamiltonian API intentionally remains 2D until the 3D refactor.
 */
class Hamiltonian3D {
    constructor({ potential, spacing = 1, hbar = 1, mass = 1 }) {
        this._potential = potential;
        this._spacing = spacing;
        this._hbar = hbar;
        this._mass = mass;
    }

    get potential() { return this._potential; }
    get spacing() { return this._spacing; }

    apply(psi) {
        const nx = this._potential.nx;
        const ny = this._potential.ny;
        const nz = this._potential.nz;
        const h2 = this._spacing * this._spacing;
        const kinetic = this._hbar * this._hbar / (2 * this._mass);
        const result = new Float64Array(psi.length);

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const i = z * nx * ny + y * nx + x;
                    const laplacian =
                        (psi[i - 1] + psi[i + 1] +
                            psi[i - nx] + psi[i + nx] +
                            psi[i - nx * ny] + psi[i + nx * ny] -
                            6 * psi[i]) / h2;

                    result[i] = -kinetic * laplacian + this._potential.data[i] * psi[i];
                }

        return result;
    }

    energyOf(psi) {
        const hPsi = this.apply(psi);
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < psi.length; i++) {
            numerator += psi[i] * hPsi[i];
            denominator += psi[i] * psi[i];
        }

        return numerator / denominator;
    }
}
