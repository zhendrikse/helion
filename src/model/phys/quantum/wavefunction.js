import {DiscreteComplexField} from "../../math/fields.js";
import { Hamiltonian } from "./hamiltonian.js";

export class WaveFunction2D {
    /** @param {number} resolution */
    constructor(resolution = 100) {
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        this._resolution = resolution;
        this._state = new DiscreteComplexField({ nx: resolution, ny: resolution})
        this._energy = 0;
        this._calulatedState = new DiscreteComplexField( { nx: resolution, ny: resolution });
    }

    /** @param {number} time */
    set time(time) { 
        const n = this._state.real.length;
        for (let i = 0; i < n; i++) {
            this._calulatedState.real[i] =  this._state.real[i] * Math.cos(this._energy * time);
            this._calulatedState.imag[i] = -this._state.real[i] * Math.sin(this._energy * time);
        }
    }

    reset() {
        this._eigenstates = [];
        this._eigenvalues = [];
    }

    /** @param {number} eigenstateNumber */
    collapseToEigenstate(eigenstateNumber) {
        this._state.real.set(this._eigenstates[eigenstateNumber].real);
        this._state.imag.set(this._eigenstates[eigenstateNumber].imag);
        this._energy = this._eigenvalues[eigenstateNumber];
    }

    get eigenstatesCount() { return this._eigenstates.length; }
    get resolution() { return this._resolution; }
    get spectrum() { return this._eigenvalues; }
    get state() { return this._calulatedState; }

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
        iterations = 900,
        calculateResiduals = true,
    } = {}) {
        return hamiltonian.solveAsync(this, { maxStates, iterations, calculateResiduals });
    }
}