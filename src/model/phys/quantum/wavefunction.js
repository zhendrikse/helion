import {DiscreteComplexField} from "../../math/fields.js";
import { Complex } from "../../math/math.js";

export class WaveFunction extends DiscreteComplexField{
    static realCoefficient = (/** @type {number} */ real) => new Complex(real, 0);

    /**
     * @param {{
     *     nx?: number
     *     ny?: number
     * }} options
     */
    constructor({
        nx = 100,
        ny = 1
    } = {}) {
        super({ nx, ny });
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        /** @type {DiscreteComplexField} */
        this._state = new DiscreteComplexField({ nx, ny });
        /**
         * @type {{
         *     eigenstate: number,
         *     coefficient: Complex
         * }[]}
         */
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
            const phase = -energy * time;
            const phaseReal = Math.cos(phase);
            const phaseImag = Math.sin(phase);
            const real = coefficient.re * phaseReal - coefficient.im * phaseImag;
            const imag = coefficient.re * phaseImag + coefficient.im * phaseReal;
            const state = this._eigenstates[eigenstate];

            for (let i = 0; i < this.nx * this.ny; i++) {
                this.real[i] += state.real[i] * real - state.imag[i] * imag;
                this.imag[i] += state.real[i] * imag + state.imag[i] * real;
            }
        }
    }

    /**
     * @param {{
     *     eigenstate: number,
     *     coefficient: Complex
     * }[]} components
     */
    setSuperposition(components) {
        this._superposition = components.map(({ eigenstate, coefficient }) => ({
            eigenstate,
            coefficient
        }));

        this._state.real.fill(0);
        this._state.imag.fill(0);

        for (const { eigenstate, coefficient } of this._superposition) {
            const state = this._eigenstates[eigenstate];

            for (let i = 0; i < this.nx * this.ny; i++) {
                this._state.real[i] += state.real[i] * coefficient.re - state.imag[i] * coefficient.im;
                this._state.imag[i] += state.real[i] * coefficient.im + state.imag[i] * coefficient.re;
            }
        }

        this.real.set(this._state.real);
        this.imag.set(this._state.imag);
    }

    /** @param {number} eigenstateNumber */
    collapseToEigenstate(eigenstateNumber) {
        this.setSuperposition([{ eigenstate: eigenstateNumber, coefficient: WaveFunction.realCoefficient(1) }]);
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
