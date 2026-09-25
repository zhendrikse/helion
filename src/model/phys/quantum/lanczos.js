import { Solver } from '../../math/numerics/solvers/solvers.js';
import { Hamiltonian } from './hamiltonian.js';

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
     * @param {WaveFunction2D} waveFunction2D
     * @param {(text: string, percent: number) => void} progressCallback
     */
    async solveAsync(waveFunction2D, progressCallback) {
        const { basis, diagonal, offDiagonal } = await this._buildKrylovSubspaceAsync(progressCallback);
        const { values, vectors } = await this._diagonalizeTridiagonal(diagonal, offDiagonal, progressCallback);

        const count = Math.min(this._states, values.length);
        const residuals = new Array(count)

        for (let state = 0; state < count; state++) {
            const psi = this._ritzVector(basis, vectors, state);
            this._normalize(psi);
            if (this._calculateResiduals)
                this._calculateResidualsFor(psi, state, residuals);
            waveFunction2D.addEigenstate(psi, new Float64Array(count), this._hamiltonian.energyOf(psi));
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
        this._normalize(q);

        let previous = null;
        let beta = 0;

        const zBuf = new Float64Array(size);
        for (let step = 0; step < count; step++) {
            const z = this._hamiltonian.apply(q, zBuf);

            if (previous)
                for (let i = 0; i < size; i++)
                    z[i] -= beta * previous[i];

            const alpha = this._dot(q, z);
            diagonal.push(alpha);

            for (let i = 0; i < size; i++)
                z[i] -= alpha * q[i];

            this._reorthogonalize(z, basis);
            basis.push(q);

            beta = this._norm(z);
            if (step < count - 1) {
                if (beta < 1e-12)
                    break;

                offDiagonal.push(beta);
                previous = q;
                q = z.slice();
                this._scale(q, 1 / beta);
            }

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

    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @param {Float64Array<ArrayBuffer>[]} basis
     */
    _reorthogonalize(vector, basis) {
        for (const q of basis) {
            const projection = this._dot(q, vector);
            for (let i = 0; i < vector.length; i++)
                vector[i] -= projection * q[i];
        }
    }

    /**
     * @param {string | any[] | Float64Array<ArrayBuffer>} a
     * @param {number[] | Float64Array<ArrayBufferLike>} b
     * @returns {number}
     */
    _dot(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++)
            sum += a[i] * b[i];
        return sum;
    }

    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @returns {number}
     */
    _norm(vector) {
        return Math.sqrt(this._dot(vector, vector));
    }

    /** @param {Float64Array<ArrayBuffer>} vector */
    _normalize(vector) {
        const norm = this._norm(vector);
        if (norm === 0)
            throw new Error('LanczosEigenstateSolver produced a zero state.');

        this._scale(vector, 1 / norm);
    }

    /** 
     * @param {Float64Array<ArrayBuffer>} vector 
     * @param {number} factor
     */
    _scale(vector, factor) {
        for (let i = 0; i < vector.length; i++)
            vector[i] *= factor;
    }
}
