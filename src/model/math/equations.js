import { LaplaceOperator } from '../transformations/operators.js';
import { Slider } from '../../core/controls.js';
import { Range } from './math.js';
import { DiscreteScalarField } from './fields.js';

export class Equation {
    /**
     * @param {{
     * speed?: number
     * damping?: number
     * }} param0 
     */
    constructor({
        speed = 1,
        damping = 0.1
    } = {}) {
        this._speed = speed;
        this._speedSquared = speed * speed;
        this._damping = damping;
    }

    get damping() { return this._damping; }

    ui() {
        return new Slider('💤 Damping')
            .withValue(this._damping * 100)
            .withRange(new Range(0, .1, 1e-4))
            // @ts-ignore
            .addEventListener('input', event => this._damping = Number(event.target.value) / 100);
    }

    /** 
     * @abstract
     * @param {DiscreteScalarField} field
     * @param {number} i
     * @param {number} j
     * @returns {number}
     */
    acceleration(field, i, j,) {
        return 0;
    }
}

export class WaveEquation extends Equation {
    /** 
     * @param {DiscreteScalarField} field
     * @param {number} i
     * @param {number} j
     * @returns {number}
     */
    acceleration(field, i, j) {
        return this._speedSquared * LaplaceOperator.at(field, i, j);
    }
}

export class BarrierWaveEquation extends Equation {
    /**
     * @param {{
     * obstacleField?: DiscreteScalarField
     * speed?: number
     * damping?: number
     * }} param0 
     */
    constructor({
        obstacleField = new DiscreteScalarField(),
        speed = 1,
        damping = 0.1
    } = {}) {
        super({ speed, damping });
        this._obstacleField = obstacleField;
    }

    /** 
     * @param {DiscreteScalarField} field
     * @param {number} i
     * @param {number} j
     * @returns {number}
     */
    acceleration(field, i, j) {
        const transmission = 1.0 - this._obstacleField.valueAt(i, j);
        //const transmission = Math.exp(-1e2 * this._obstacleField.valueAt(i, j));
        return transmission * this._speedSquared * LaplaceOperator.at(field, i, j);
    }
}