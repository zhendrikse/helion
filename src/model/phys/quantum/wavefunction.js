import {DiscreteComplexField} from "../../math/fields.js";
import {MathPhysicsModelBehavior} from "../../behavior.js";
import {Complex} from "../../math/math.js";

export class WaveFunction1D extends MathPhysicsModelBehavior {
    /**
     * @param {{
     *     amplitude?: number
     *     lambda?: number
     *     omega?: number
     * }} options
     */
    constructor({
        amplitude = 1,
        lambda = 2,
        omega = 3 * Math.PI
    } = {}) {
        super();
        this.amplitude = amplitude;
        this._time = 0;
        const k = 2 * Math.PI / lambda;
        this._phase = (x, t) => k * x - omega * t;
    }

    set time(time) { this._time = time; }

    sample(x) {
        const phase = this._phase(x, this._time);
        return new Complex( Math.cos(phase) * this.amplitude, Math.sin(phase) * this.amplitude);
    }
}

export class WaveFunction2D extends DiscreteComplexField{
    /** @param {number} resolution */
    constructor(resolution = 100) {
        super({ nx: resolution, ny: resolution})
        /** @type {DiscreteComplexField[]} */
        this._eigenstates = [];
        /** @type {number[]} */
        this._eigenvalues = [];
        this._state = new DiscreteComplexField({ nx: resolution, ny: resolution});
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
