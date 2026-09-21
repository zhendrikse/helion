import { DiscreteComplexField, DiscreteScalarField, DiscreteScalarField3D } from '../../fields.js';
import { Hamiltonian } from '../../quantum/hamiltonian.js';
import {Complex} from '../../math.js';
import { Solver } from './solvers.js';

/**
 * Matrix-free 3D finite-difference Schrödinger eigenstate solver.
 *
 * This is intentionally a small reference implementation for stationary
 * quantum states. It uses imaginary-time propagation with Gram-Schmidt
 * deflation, making it useful as a baseline before introducing Lanczos/LOBPCG.
 */
export class SchrodingerEigenstateSolver3D extends Solver {
    constructor({
        hamiltonian = null,
        potential = new DiscreteScalarField3D(),
        spacing = 1,
        hbar = 1,
        mass = 1,
        states = 1,
        iterations = 400
    } = {}) {
        super();
        this._hamiltonian = hamiltonian ?? new Hamiltonian({ potential, spacing, hbar, mass });
        this._potential = this._hamiltonian.potential;
        this._states = states;
        this._iterations = iterations;
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

    /**
     * Measure how well an eigenstate satisfies Hψ = Eψ and how
     * closely its amplitude follows spherical symmetry.
     *
     * Spherical symmetry is measured on the discrete Cartesian grid by
     * comparing points that have exactly the same distance from the grid
     * centre. This avoids introducing an arbitrary radial bin width.
     *
     * @param {number} index
     * @returns {{ energy: number, residual: number, radialSymmetryError: number, inversionParity: number }}
     */
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

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const i = this._index(x, y, z);
                    const difference = hPsi[i] - energy * psi[i];
                    residualSquared += difference * difference;
                    normSquared += psi[i] * psi[i];
                    inversionOverlap += psi[i] * psi[this._index(nx - 1 - x, ny - 1 - y, nz - 1 - z)];
                }

        const residual = Math.sqrt(residualSquared / normSquared);

        const shellSums = new Map();
        const shellCounts = new Map();

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dz = z - cz;
                    const radiusSquared = dx * dx + dy * dy + dz * dz;
                    const amplitude = Math.abs(psi[this._index(x, y, z)]);

                    shellSums.set(
                        radiusSquared,
                        (shellSums.get(radiusSquared) ?? 0) + amplitude
                    );
                    shellCounts.set(
                        radiusSquared,
                        (shellCounts.get(radiusSquared) ?? 0) + 1
                    );
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

    initialize(psi, dt = 0.002) {
        this.reset();

        this._validateWaveFunction(psi);

        for (let state = 0; state < this._states; state++)
            this._createEigenState(state, psi, dt);

        return this;
    }

    /**
     * Compute eigenstates while periodically yielding to the browser, so a UI
     * can render progress updates during long-running calculations.
     *
     * @param {DiscreteComplexField3D} psi
     * @param {number} dt
     * @param {{yieldEvery?: number, onProgress?: (progress: {completedIterations: number, totalIterations: number, percent: number}) => void}} options
     */
    async initializeAsync(psi, dt = 0.002, {
        yieldEvery = 25,
        onProgress = () => {}
    } = {}) {
        this.reset();
        this._validateWaveFunction(psi);

        const totalIterations = this._states * this._iterations;
        let completedIterations = 0;
        const reportProgress = () => onProgress({
            completedIterations,
            totalIterations,
            percent: totalIterations === 0 ? 1 : completedIterations / totalIterations
        });

        reportProgress();
        for (let state = 0; state < this._states; state++) {
            const psiState = this._initialStateFor(state, psi);

            for (let iteration = 0; iteration < this._iterations; iteration++) {
                const hPsi = this._applyHamiltonian(psiState);
                for (let i = 0; i < psiState.length; i++)
                    psiState[i] -= dt * hPsi[i];

                this._orthogonalize(psiState);
                this._normalize(psiState);
                completedIterations++;

                if (completedIterations % yieldEvery === 0 || completedIterations === totalIterations) {
                    reportProgress();
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            this._eigenstates.push(psiState);
            this._eigenvalues.push(this._rayleighQuotient(psiState));
        }

        return this;
    }

    _createEigenState(state, psi, dt) {
        const psiState = this._initialStateFor(state, psi);

        for (let iteration = 0; iteration < this._iterations; iteration++) {
            const hPsi = this._applyHamiltonian(psiState);
            for (let i = 0; i < psiState.length; i++)
                psiState[i] -= dt * hPsi[i];

            this._orthogonalize(psiState);
            this._normalize(psiState);
        }

        this._eigenstates.push(psiState);
        this._eigenvalues.push(this._rayleighQuotient(psiState));
    }

    _validateWaveFunction(psi) {
        if (this._potential.nx !== psi.nx ||
            this._potential.ny !== psi.ny ||
            this._potential.nz !== psi.nz)
            throw new Error('Schrödinger 3D potential and wavefunction grids must have the same dimensions.');
    }

    _initialStateFor(state, psi) {
        const { nx, ny, nz } = psi;
        const psiState = new Float64Array(nx * ny * nz);
        const cx = (nx - 1) / 2;
        const cy = (ny - 1) / 2;
        const cz = (nz - 1) / 2;
        const width = this._hamiltonian.spacing * 2.0;

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const spacing = this._hamiltonian.spacing;
                    const dx = (x - cx) * spacing;
                    const dy = (y - cy) * spacing;
                    const dz = (z - cz) * spacing;
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
        return psiState;
    }

    _index(x, y, z) {
        return z * this._potential.nx * this._potential.ny +
            y * this._potential.nx + x;
    }

    _applyHamiltonian(psi) {
        return this._hamiltonian.apply(psi);
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
        hamiltonian = null,
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
        this._hamiltonian = hamiltonian ?? new Hamiltonian({ potential, spacing, hbar, mass });
        this._potential = this._hamiltonian.potential;
        this._states = states;
        this._iterations = iterations;
        this.reset();
    }

    get hamiltonian() { return this._hamiltonian; }
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
        return this._hamiltonian.apply(psi);
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
     * @param {{ potential?: DiscreteScalarField, hamiltonian?: Hamiltonian }} param0 
     */
    constructor({
        hamiltonian = null,
        potential = new DiscreteScalarField()
    } = {}) {
        super();
        // Preserve the historical dimensionless realtime discretization while
        // routing the operator through the shared Hamiltonian abstraction.
        this._hamiltonian = hamiltonian ?? new Hamiltonian({
            potential,
            hbar: Math.sqrt(2),
            mass: 1,
            potentialScale: 2
        });

        this._nextRe = null;
        this._nextIm = null;
    }

    get hamiltonian() { return this._hamiltonian; }

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
        const hRe = this._hamiltonian.apply(re);
        const w = psi.nx;

        for (let x = 1; x < psi.nx - 1; x++)
            for (let y = 1; y < psi.ny - 1; y++) {
                const i = y * w + x;
                psi.imag[i] += 0.5 * dt * hRe[i];
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

        const hRe = this._hamiltonian.apply(re);

        // Keep the original centered-difference/leapfrog scheme:
        // Im(n+1) = Im(n) - dt H Re(n)
        // Re(n+1) = Re(n) + dt H Im(n+1)
        // The second line is intentionally based on imNext, not im.
        for (let x = 1; x < psi.nx - 1; x++)
            for (let y = 1; y < psi.ny - 1; y++) {
                const i = y * w + x;
                imNext[i] = im[i] - dt * hRe[i];
            }

        const hImNext = this._hamiltonian.apply(imNext);

        for (let x = 1; x < psi.nx - 1; x++)
            for (let y = 1; y < psi.ny - 1; y++) {
                const i = y * w + x;
                reNext[i] = re[i] + dt * hImNext[i];
            }

        [psi.real, this._nextRe] = [this._nextRe, psi.real];
        [psi.imag, this._nextIm] = [this._nextIm, psi.imag];
    }
}
