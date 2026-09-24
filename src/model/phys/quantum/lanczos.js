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
        const matrix = Array.from({ length: n }, (_, row) => {
            const values = new Float64Array(n);
            values[row] = diagonal[row];
            if (row > 0)
                values[row - 1] = offDiagonal[row - 1];
            if (row < n - 1)
                values[row + 1] = offDiagonal[row];
            return values;
        });

        const vectors = Array.from({ length: n }, (_, row) => {
            const values = new Float64Array(n);
            values[row] = 1;
            return values;
        });

        const maxIterations = Math.max(100, 20 * n * n);

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let p = 0;
            let q = 1;
            let largest = 0;

            for (let row = 0; row < n; row++)
                for (let col = row + 1; col < n; col++) {
                    const value = Math.abs(matrix[row][col]);
                    if (value > largest) {
                        largest = value;
                        p = row;
                        q = col;
                    }
                }

            if (largest < 1e-12)
                break;

            const app = matrix[p][p];
            const aqq = matrix[q][q];
            const apq = matrix[p][q];
            const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
            const c = Math.cos(phi);
            const s = Math.sin(phi);

            for (let row = 0; row < n; row++) {
                if (row === p || row === q)
                    continue;

                const arp = matrix[row][p];
                const arq = matrix[row][q];
                matrix[row][p] = c * arp - s * arq;
                matrix[p][row] = matrix[row][p];
                matrix[row][q] = s * arp + c * arq;
                matrix[q][row] = matrix[row][q];
            }

            matrix[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
            matrix[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
            matrix[p][q] = 0;
            matrix[q][p] = 0;

            for (let row = 0; row < n; row++) {
                const vrp = vectors[row][p];
                const vrq = vectors[row][q];
                vectors[row][p] = c * vrp - s * vrq;
                vectors[row][q] = s * vrp + c * vrq;
            }
        }

        const eigenpairs = diagonal.map((_, index) => ({
            value: matrix[index][index],
            vector: vectors.map(row => row[index])
        })).sort((a, b) => a.value - b.value);

        // Return eigenvectors in the same row/column layout as the Jacobi
        // accumulator: vectors[basisIndex][eigenstateIndex]. The previous
        // implementation returned the transpose, which mixed up the Ritz
        // vectors even though the Ritz eigenvalues themselves were sorted.
        const sortedVectors = Array.from(
            { length: n },
            () => new Float64Array(eigenpairs.length)
        );

        for (let state = 0; state < eigenpairs.length; state++)
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
