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
        super({ nx, ny });
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        /** @type {DiscreteComplexField} */
        this._state = new DiscreteComplexField({ nx, ny });
        /** @type {{ eigenstate: number, coefficient: number | { real: number, imag: number }}[]} */
        this._superposition = [];
    }

    reset() {
        super.reset();
        this._eigenstates = [];
        this._eigenvalues = [];
        this._state.reset();
        this._superposition = [];
    }

    /** @param {number} time */
    set time(time) {
        this.real.fill(0);
        this.imag.fill(0);

        for (const { eigenstate, coefficient } of this._superposition) {
            const energy = this._eigenvalues[eigenstate];
            const coefficientReal = typeof coefficient === 'number' ? coefficient : coefficient.real;
            const coefficientImag = typeof coefficient === 'number' ? 0 : coefficient.imag;
            const phase = -energy * time;
            const phaseReal = Math.cos(phase);
            const phaseImag = Math.sin(phase);
            const real = coefficientReal * phaseReal - coefficientImag * phaseImag;
            const imag = coefficientReal * phaseImag + coefficientImag * phaseReal;
            const state = this._eigenstates[eigenstate];

            for (let i = 0; i < this.nx * this.ny; i++) {
                this.real[i] += state.real[i] * real - state.imag[i] * imag;
                this.imag[i] += state.real[i] * imag + state.imag[i] * real;
            }
        }
    }

    /**
     * @param {number} eigenstateNumber
     * @param {number | { real: number, imag: number }} coefficient
     */
    setSuperposition([{ eigenstate, coefficient }]) {
        this._superposition = arguments[0].map(({ eigenstate, coefficient }) => ({
            eigenstate,
            coefficient
        }));

        this._state.real.fill(0);
        this._state.imag.fill(0);

        for (const { eigenstate, coefficient } of this._superposition) {
            const coefficientReal = typeof coefficient === 'number' ? coefficient : coefficient.real;
            const coefficientImag = typeof coefficient === 'number' ? 0 : coefficient.imag;
            const state = this._eigenstates[eigenstate];

            for (let i = 0; i < this.nx * this.ny; i++) {
                this._state.real[i] += state.real[i] * coefficientReal - state.imag[i] * coefficientImag;
                this._state.imag[i] += state.real[i] * coefficientImag + state.imag[i] * coefficientReal;
            }
        }

        this.real.set(this._state.real);
        this.imag.set(this._state.imag);
    }

    /** @param {number} eigenstateNumber */
    collapseToEigenstate(eigenstateNumber) {
        this.setSuperposition([{ eigenstate: eigenstateNumber, coefficient: 1 }]);
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
