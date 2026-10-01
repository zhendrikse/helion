import {DiscreteComplexField} from "../../math/fields.js";

export class WaveFunction extends DiscreteComplexField{
    /**
     * @param {{
     *     nx?: number
     *     ny?: number
     * }} options
     */
    constructor({
        nx = 100,
        ny = 100
    } = {}) { 
        super({ nx, ny})
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        this._state = new DiscreteComplexField({ nx, ny });
        this._energy = 0;
    }

    reset() {
        super.reset();
        this._eigenstates = [];
        this._eigenvalues = [];
        this._state.reset();
        this._energy = 0;
    }

    /** @param {number} time */
    set time(time) {
        const phase = this._energy * time;
        for (let i = 0; i < this.nx * this.ny; i++) {
            this.real[i] = this._state.real[i] * Math.cos(phase) - this._state.imag[i] * Math.sin(phase);
            this.imag[i] = this._state.real[i] * Math.sin(phase) + this._state.imag[i] * Math.cos(phase);
        }
    }

    /** @param {number} eigenstateNumber */
    collapseToEigenstate(eigenstateNumber) {
        this._state.real.set(this._eigenstates[eigenstateNumber].real);
        this._state.imag.set(this._eigenstates[eigenstateNumber].imag);
        this._energy = this._eigenvalues[eigenstateNumber];
    }

    get eigenstatesCount() { return this._eigenstates.length; }
    get spectrum() { return this._eigenvalues; }

    /**
     * @param {Float64Array<ArrayBuffer>} real
     * @param {Float64Array<ArrayBuffer>} imag
     * @param {number} energy
     */
    addEigenstate(real, imag, energy) {
        this._eigenvalues.push(energy);
        const state = new DiscreteComplexField({nx: this.nx, ny: this.ny});
        state.real.set(real);
        state.imag.set(imag);
        this._eigenstates.push(state);
    }
}
