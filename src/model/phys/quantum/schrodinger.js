import { DiscreteComplexField } from '../../math/fields.js';
import { Solver } from '../../math/numerics/solvers/solvers.js';
import { Hamiltonian } from './hamiltonian.js';

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
        /** @type {Float64Array<ArrayBufferLike>} */
        this._nextRe = new Float64Array();
        /** @type {Float64Array<ArrayBufferLike>} */
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
