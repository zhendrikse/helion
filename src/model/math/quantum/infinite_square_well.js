import { Complex } from '../math.js';
import { Solver } from '../numerics/solvers/solvers.js';

/**
 * Analytic time evolution for a particle in a two-dimensional infinite square well.
 *
 * The well is represented by the stationary basis
 *
 *   psi(n,m) = sin(n*pi*x/Lx) sin(m*pi*y/Ly)
 *
 * and the wavefunction evolves by applying the corresponding phase factors.
 *
 * This is a physical model for a specific system, rather than a general
 * Schrödinger solver.
 */
export class InfiniteSquareWell2D extends Solver {
    /**
     * @param {{
     *   width?: number,
     *   height?: number,
     *   hbar?: number,
     *   mass?: number,
     *   maxMode?: number
     * }} [options]
     */
    constructor({
        width = 10,
        height = 10,
        hbar = 1,
        mass = 1,
        maxMode = 10
    } = {}) {
        super();
        this._width = width;
        this._height = height;
        this._hbar = hbar;
        this._mass = mass;
        this._maxMode = maxMode;
        this._time = 0;
        this._eigenstates = [];
        this._coefficients = [];
        this._energies = [];
    }

    /**
     * @param {import('../fields.js').DiscreteComplexField} psi
     */
    initialize(psi) {
        this._validateWaveFunction(psi);
        this._time = 0;
        this._eigenstates = [];
        this._coefficients = [];
        this._energies = [];

        for (let nx = 1; nx <= this._maxMode; nx++)
            for (let ny = 1; ny <= this._maxMode; ny++)
                this._addEigenstate(nx, ny, psi);

        const initialState = this._initialState(psi);
        for (let state = 0; state < this._eigenstates.length; state++)
            this._coefficients[state] = this._innerProduct(initialState, this._eigenstates[state]);

        return this;
    }

    /**
     * @param {import('../fields.js').DiscreteComplexField} psi
     * @param {number} dt
     */
    step(psi, dt) {
        this._validateWaveFunction(psi);
        this._time += dt;

        for (let y = 0; y < psi.ny; y++)
            for (let x = 0; x < psi.nx; x++) {
                let value = new Complex();

                for (let state = 0; state < this._eigenstates.length; state++) {
                    const eigenstate = this._eigenstates[state];
                    const coefficient = this._coefficients[state];
                    const phase = -this._energies[state] * this._time / this._hbar;
                    const contribution = Complex.fromPhase(phase);

                    contribution.multiply(new Complex(
                        coefficient * eigenstate[this._index(x, y, psi.nx)],
                        0
                    ));
                    value.add(contribution);
                }

                const index = this._index(x, y, psi.nx);
                psi.real[index] = value.re;
                psi.imag[index] = value.im;
            }
    }

    _validateWaveFunction(psi) {
        if (psi.nx < 2 || psi.ny < 2)
            throw new Error('InfiniteSquareWell2D requires a wavefunction grid with at least 2 x 2 samples.');
    }

    _index(x, y, nx) {
        return y * nx + x;
    }

    _addEigenstate(nx, ny, psi) {
        const state = new Float64Array(psi.nx * psi.ny);
        let normSquared = 0;

        for (let y = 0; y < psi.ny; y++) {
            const yy = this._height * y / (psi.ny - 1);
            for (let x = 0; x < psi.nx; x++) {
                const xx = this._width * x / (psi.nx - 1);
                const value =
                    Math.sin(nx * Math.PI * xx / this._width) *
                    Math.sin(ny * Math.PI * yy / this._height);

                state[this._index(x, y, psi.nx)] = value;
                normSquared += value * value;
            }
        }

        const norm = Math.sqrt(normSquared);
        for (let i = 0; i < state.length; i++)
            state[i] /= norm;

        this._eigenstates.push(state);
        this._energies.push(
            this._hbar * this._hbar * Math.PI * Math.PI /
            (2 * this._mass) *
            (nx * nx / (this._width * this._width) + ny * ny / (this._height * this._height))
        );
    }

    _initialState(psi) {
        const state = new Float64Array(psi.nx * psi.ny);
        let normSquared = 0;
        const halfX = Math.floor(psi.nx / 2);
        const halfY = Math.floor(psi.ny / 2);

        for (let y = 0; y < psi.ny; y++)
            for (let x = 0; x < psi.nx; x++) {
                const value = x < halfX && y < halfY ? 1 : 0;
                state[this._index(x, y, psi.nx)] = value;
                normSquared += value * value;
            }

        const norm = Math.sqrt(normSquared);
        for (let i = 0; i < state.length; i++)
            state[i] /= norm;

        return state;
    }

    _innerProduct(left, right) {
        let result = 0;
        for (let i = 0; i < left.length; i++)
            result += left[i] * right[i];
        return result;
    }
}
