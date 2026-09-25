import {DiscreteComplexField} from "../../math/fields.js";

export class WaveFunction2D {
    /** @param {number} resolution */
    constructor(resolution = 100) {
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        this._resolution = resolution;
    }

    get eigenstatesCount() { return this._eigenstates.length; }
    get resolution() { return this._resolution; }
    get spectrum() { return this._eigenvalues; }

    /**
     * @param {Float64Array<ArrayBuffer>} real
     * @param {Float64Array<ArrayBuffer>} imag
     * @param {number} energy
     */
    addEigenstate(real, imag, energy) {
        this._eigenvalues.push(energy);
        const state = new DiscreteComplexField({nx: this._resolution, ny: this._resolution});
        state.real.set(real);
        state.imag.set(imag);
        this._eigenstates.push(state);
    }

    /** @param {number} index */
    eigenstateAt(index) {
        return this._eigenstates[index];
    }

    /**
     * @param {Hamiltonian} hamiltonian
     * @param {{
     *     maxStates?: number
     *     iterations?: number
     *     calculateResiduals?: boolean
     * }}param1
     *
     * @returns {Promise<number[]>} residuals
     */
    async apply(hamiltonian, {
        maxStates = 15,
        iterations = 800,
        calculateResiduals = true,
    } = {}) {
        return hamiltonian.solveAsync(this, { maxStates, iterations, calculateResiduals });
    }
}