import { DiscreteComplexField3D, DiscreteScalarField3D } from '../../fields.js';
import { Solver } from './solvers.js';

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
        return z * this._potential.nx * this._potential.ny +
            y * this._potential.nx + x;
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
