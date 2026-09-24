import { Solver } from '../../math/numerics/solvers/solvers.js';

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
     *     hamiltonian?: { N: number, apply: (psi: Float64Array) => Float64Array },
     *     states?: number,
     *     iterations?: number
     * }} param0
     */
    constructor({ hamiltonian, states = 4, iterations = null } = {}) {
        super();

        if (!hamiltonian)
            throw new TypeError('LanczosEigenstateSolver requires a Hamiltonian.');

        if (!Number.isInteger(states) || states < 1)
            throw new RangeError('LanczosEigenstateSolver states must be a positive integer.');

        this._hamiltonian = hamiltonian;
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
     * Solve for the lowest eigenstates.
     *
     * The optional iterations value controls the size of the Krylov
     * subspace. If omitted, a modest multiple of the requested state count
     * is used. More Lanczos steps give the Ritz values more opportunity to
     * converge, at the cost of storing more basis vectors.
     *
     * @param {(percent: number) => void} [progressReportCallback]
     * @returns {{states: Float64Array[], energies: number[]}}
     */
    solve(progressReportCallback) {
        this.reset();

        const { basis, diagonal, offDiagonal } =
            this._buildKrylovSubspace(progressReportCallback);

        const { values, vectors } =
            this._diagonalizeTridiagonal(diagonal, offDiagonal);

        const count = Math.min(this._states, values.length);
        const states = new Array(count);
        const energies = new Array(count);

        for (let state = 0; state < count; state++) {
            const psi = this._ritzVector(basis, vectors, state);
            this._normalize(psi);
            states[state] = psi;
            energies[state] = this._hamiltonian.energyOf(psi);
        }

        // The tridiagonal eigenvalues are Ritz approximations. Recompute the
        // Rayleigh quotients after forming the actual grid-space vectors.
        const ordered = states
            .map((psi, index) => ({ psi, energy: energies[index] }))
            .sort((a, b) => a.energy - b.energy);

        this._eigenstates = ordered.map(item => item.psi);
        this._eigenvalues = ordered.map(item => item.energy);

        progressReportCallback?.(100);
        return {
            states: this._eigenstates.slice(),
            energies: this._eigenvalues.slice()
        };
    }

    /**
     * Cooperative asynchronous variant of solve().
     *
     * @param {(percent: number) => void} [progressReportCallback]
     * @returns {Promise<{states: Float64Array[], energies: number[]}>}
     */
    async solveAsync(progressReportCallback) {
        this.reset();

        const { basis, diagonal, offDiagonal } =
            await this._buildKrylovSubspaceAsync(progressReportCallback);

        const { values, vectors } =
            this._diagonalizeTridiagonal(diagonal, offDiagonal);

        const count = Math.min(this._states, values.length);
        const states = new Array(count);
        const energies = new Array(count);

        for (let state = 0; state < count; state++) {
            const psi = this._ritzVector(basis, vectors, state);
            this._normalize(psi);
            states[state] = psi;
            energies[state] = this._hamiltonian.energyOf(psi);
        }

        const ordered = states
            .map((psi, index) => ({ psi, energy: energies[index] }))
            .sort((a, b) => a.energy - b.energy);

        this._eigenstates = ordered.map(item => item.psi);
        this._eigenvalues = ordered.map(item => item.energy);

        progressReportCallback?.(100);
        return {
            states: this._eigenstates.slice(),
            energies: this._eigenvalues.slice()
        };
    }

    reset() {
        this._eigenstates = [];
        this._eigenvalues = [];
    }

    _iterationCount() {
        const dimension = this._hamiltonian.N * this._hamiltonian.N;
        const defaultIterations = Math.max(30, this._states * 4 + 20);
        const requested = this._iterations ?? defaultIterations;
        return Math.min(Math.max(this._states + 2, requested), dimension);
    }

    _buildKrylovSubspace(progressReportCallback) {
        const size = this._hamiltonian.N * this._hamiltonian.N;
        const count = this._iterationCount();
        const basis = [];
        const diagonal = [];
        const offDiagonal = [];

        let q = this._initialVector(size);
        this._normalize(q);

        let previous = null;
        let beta = 0;

        for (let step = 0; step < count; step++) {
            const z = this._hamiltonian.apply(q);

            if (previous)
                for (let i = 0; i < size; i++)
                    z[i] -= beta * previous[i];

            const alpha = this._dot(q, z);
            diagonal.push(alpha);

            for (let i = 0; i < size; i++)
                z[i] -= alpha * q[i];

            // Full reorthogonalization keeps the Lanczos basis numerically
            // orthogonal. This is especially useful for degenerate states.
            this._reorthogonalize(z, basis);

            basis.push(q);

            beta = this._norm(z);
            if (step < count - 1) {
                if (beta < 1e-12)
                    break;

                offDiagonal.push(beta);
                previous = q;
                q = z;
                this._scale(q, 1 / beta);
            }

            progressReportCallback?.(100 * (step + 1) / count);
        }

        return { basis, diagonal, offDiagonal };
    }

    async _buildKrylovSubspaceAsync(progressReportCallback) {
        const size = this._hamiltonian.N * this._hamiltonian.N;
        const count = this._iterationCount();
        const basis = [];
        const diagonal = [];
        const offDiagonal = [];

        let q = this._initialVector(size);
        this._normalize(q);

        let previous = null;
        let beta = 0;

        for (let step = 0; step < count; step++) {
            const z = this._hamiltonian.apply(q);

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
                q = z;
                this._scale(q, 1 / beta);
            }

            progressReportCallback?.(100 * (step + 1) / count);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return { basis, diagonal, offDiagonal };
    }

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
     */
    _diagonalizeTridiagonal(diagonal, offDiagonal) {
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

    _reorthogonalize(vector, basis) {
        for (const q of basis) {
            const projection = this._dot(q, vector);
            for (let i = 0; i < vector.length; i++)
                vector[i] -= projection * q[i];
        }
    }

    _dot(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++)
            sum += a[i] * b[i];
        return sum;
    }

    _norm(vector) {
        return Math.sqrt(this._dot(vector, vector));
    }

    _normalize(vector) {
        const norm = this._norm(vector);
        if (norm === 0)
            throw new Error('LanczosEigenstateSolver produced a zero state.');

        this._scale(vector, 1 / norm);
    }

    _scale(vector, factor) {
        for (let i = 0; i < vector.length; i++)
            vector[i] *= factor;
    }
}
