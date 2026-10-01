import { VectorField } from '../math/fields.js';
import { Vec2, Vec3 } from '../math/objects.js';
import { ScalarFieldCalculus } from '../math/numerics/discretecalc.js';
import { MathPhysicsModelBehavior } from "../behavior.js";

export class PlaneWave1D extends MathPhysicsModelBehavior {
    /**
     * @param {number} amplitude
     * @param {number} lambda
     * @param {number} omega
     */
    constructor(amplitude, lambda, omega) {
        super();
        this._time = 0;
        const k = 2 * Math.PI / lambda;
        this._func = (x, t) => amplitude * Math.cos(k * x - omega * t);
    }

    set time(t) { this._time = t; }

    /** @param {number} x */
    sample(x) {
        return this._func(x, this._time);
    }
}

/**
 * Electric field derived from a scalar potential field.
 *
 * The electric field is defined as
 *
 *     E = -∇V
 *
 * For a discrete potential field, spatial positions are mapped to the
 * native grid using gridOrigin and gridSpacing. The gradient is then
 * calculated directly from the native grid values using a central difference.
 */
export class ElectricField extends VectorField {
    /**
     * @param {{
     * potential?: DiscreteScalarField
     * gridSpacing?: number,
     * derivativeSpacing?: number
     * }} options
     */
    constructor({
        potential,
        gridSpacing = 1,
        derivativeSpacing = gridSpacing
    } = {}) {
        super();

        if (potential == null)
            throw new Error('Cannot calculate electric field without potential.');

        if (gridSpacing <= 0)
            throw new Error('gridSpacing must be > 0.');

        if (derivativeSpacing <= 0)
            throw new Error('derivativeSpacing must be > 0.');
        this._potentialField = potential;
        this._target = new Vec2();
        this._gridSpacing = gridSpacing;
        this._scalarFieldCalculus = new ScalarFieldCalculus(potential);
        this._h = derivativeSpacing;
    }

    sample(position = new Vec2(), target = this._target) {
        const width = 0.5 * this._potentialField.nx * this._gridSpacing;
        const height = 0.5 * this._potentialField.ny * this._gridSpacing;

        const i = Math.round((position.x + width) / this._gridSpacing - 0.5);
        const j = Math.round((position.y + height) / this._gridSpacing - 0.5);
        this.valueAt(i, j, target);
        return target;
    }

    /**
     * Evaluate the electric field at an exact native grid position.
     *
     * @param {number} i grid x-index
     * @param {number} j grid y-index
     * @param {Vec2 | Vec3} target output vector
     * @returns {Vec2 | Vec3}
     */
    valueAt(i, j, target = this._target) {
        this._scalarFieldCalculus.gradient(i, j, this._h, target);
        target.negate();
        return target;
    }
}

