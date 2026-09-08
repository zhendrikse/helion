import { VectorField, DiscreteScalarField } from "../math/fields.js";
import { Vec2, Vec3 } from "../math/math.js";
import { ScalarFieldCalculus } from "../math/numerics/discretecalc.js"

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
     * potentialField?: DiscreteScalarField
     * gridSpacing?: number,
     * gridOrigin?: Vec2,
     * derivativeSpacing?: number
     * }} options
     */
    constructor({
        potentialField,
        gridSpacing = 1,
        gridOrigin = new Vec2(0, 0),
        derivativeSpacing = gridSpacing
    } = {}) {
        super();

        if (potentialField == null)
            throw new Error("Cannot calculate electric field without potential.");

        if (gridSpacing <= 0)
            throw new Error("gridSpacing must be > 0.");

        if (derivativeSpacing <= 0)
            throw new Error("derivativeSpacing must be > 0.");

        this._potentialField = potentialField;
        this._gridSpacing = gridSpacing;
        this._gridOrigin = gridOrigin.clone();
        this._derivativeSpacing = derivativeSpacing;
        this._scalarFieldCalculus = new ScalarFieldCalculus(potentialField);
        this._target = new Vec3();
    }

    /**
     * Sample the electric field at a normalized position.
     *
     * @param {number} u normalized coordinate one.
     * @param {number} v normalized coordinate two.
     * @param {Vec2 | Vec3} target
     * @returns {Vec2 | Vec3}
     */
    sample(u, v, target = this._target) {
        const x = Math.round(u * (this._potentialField.nx - 1));
        const y = Math.round(v * (this._potentialField.ny - 1));

        return this.valueAt(x, y, target);
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
        this._scalarFieldCalculus.gradient(i, j, this._derivativeSpacing, target);
        target.negate();
        return target;
    }
}