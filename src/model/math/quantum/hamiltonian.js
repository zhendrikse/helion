import { DiscreteScalarField, DiscreteScalarField3D } from '../fields.js';

/**
 * Discrete Hamiltonian for a particle on a Cartesian grid.
 *
 * H = -(hbar² / 2m) ∇² + V
 *
 * The operator is applied matrix-free, which keeps the representation useful
 * for iterative eigensolvers and time-evolution methods.
 */
export class Hamiltonian {
    constructor({
        potential = new DiscreteScalarField(),
        spacing = 1,
        hbar = 1,
        mass = 1,
        potentialScale = 1
    } = {}) {
        this._potential = potential;
        this._spacing = spacing;
        this._hbar = hbar;
        this._mass = mass;
        this._potentialScale = potentialScale;

        if (!(potential instanceof DiscreteScalarField) &&
            !(potential instanceof DiscreteScalarField3D))
            throw new TypeError('Hamiltonian requires a discrete scalar potential.');

        if (spacing <= 0)
            throw new RangeError('Hamiltonian spacing must be greater than zero.');
        if (mass <= 0)
            throw new RangeError('Hamiltonian mass must be greater than zero.');
    }

    get potential() { return this._potential; }
    get spacing() { return this._spacing; }
    get hbar() { return this._hbar; }
    get mass() { return this._mass; }
    get dimension() { return this._potential.nz === undefined ? 2 : 3; }

    apply(psi) {
        if (psi.length !== this._potential.data.length)
            throw new Error(`Hamiltonian and wavefunction sizes must match (${this._potential.data.length} samples expected).`);
        return this.dimension === 2 ? this._apply2D(psi) : this._apply3D(psi);
    }

    energyOf(psi) {
        const hPsi = this.apply(psi);
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < psi.length; i++) {
            numerator += psi[i] * hPsi[i];
            denominator += psi[i] * psi[i];
        }
        if (denominator === 0)
            throw new Error('Cannot calculate Hamiltonian energy for a zero state.');
        return numerator / denominator;
    }

    _apply2D(psi) {
        const nx = this._potential.nx;
        const ny = this._potential.ny;
        const h2 = this._spacing * this._spacing;
        const kinetic = this._hbar * this._hbar / (2 * this._mass);
        const hPsi = new Float64Array(psi.length);

        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                const laplacian =
                    (psi[i - 1] + psi[i + 1] + psi[i - nx] + psi[i + nx] - 4 * psi[i]) / h2;
                hPsi[i] = -kinetic * laplacian +
                    this._potentialScale * this._potential.data[i] * psi[i];
            }
        return hPsi;
    }

    _apply3D(psi) {
        const nx = this._potential.nx;
        const ny = this._potential.ny;
        const nz = this._potential.nz;
        const h2 = this._spacing * this._spacing;
        const kinetic = this._hbar * this._hbar / (2 * this._mass);
        const hPsi = new Float64Array(psi.length);

        for (let z = 1; z < nz - 1; z++)
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    const i = z * nx * ny + y * nx + x;
                    const laplacian =
                        (psi[i - 1] + psi[i + 1] + psi[i - nx] + psi[i + nx] +
                         psi[i - nx * ny] + psi[i + nx * ny] - 6 * psi[i]) / h2;
                    hPsi[i] = -kinetic * laplacian +
                        this._potentialScale * this._potential.data[i] * psi[i];
                }
        return hPsi;
    }
}
