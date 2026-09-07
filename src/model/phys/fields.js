import { VectorField, Field } from "../math/fields.js";
import { Vec2, Vec3} from "../math/math.js";

/**
 * Electric field derived from a scalar potential field.
 *
 * For a discrete potential field, valueAt(i, j) computes the electric field
 * directly from the native grid values using a central difference. sample()
 * maps a spatial position to the corresponding grid cell and then delegates
 * to valueAt(), avoiding interpolation of the potential.
 *
 * For a continuous potential field, sample() computes the gradient using a
 * central finite difference of the potential's sample() method.
 */
export class ElectricField extends VectorField {
    /**
     * @typedef {Object} EletricFieldOptions
     * @property {Field} [potentialField]
     * @property {number} [gridSpacing]
     * @property {number} [derivativeSpacing]
     * @property {Vec2} [gridOrigin]
     */

    /**
     * @param {EletricFieldOptions} [options]
     */
    constructor({
        potentialField,
        gridSpacing = 1,
        gridOrigin = new Vec2(0, 0),
        derivativeSpacing = gridSpacing
    } = {}) {
        super();
        if (potentialField === null) 
            throw new Error("Cannot calculate electric field without potential");
        this._potentialField = potentialField;
        this._gridSpacing = gridSpacing;
        this._gridOrigin = gridOrigin.clone();
        this._derivativeSpacing = derivativeSpacing;

        this._target = new Vec3();
    }

    /**
     * Sample the electric field at a spatial position.
     *
     * Discrete potential fields are evaluated at the native grid point;
     * continuous potential fields use a central finite difference.
     * @param {Vec2} position
     */
    sample(position , target = this._target) {
        const h = this._derivativeSpacing;
        const vx1 = this._potentialField.sample(position.x + h, position.y);
        const vx0 = this._potentialField.sample(position.x - h, position.y);
        const vy1 = this._potentialField.sample(position.x, position.y + h);
        const vy0 = this._potentialField.sample(position.x, position.y - h);

        return target.set(
            -(vx1 - vx0) / (2 * h),
            -(vy1 - vy0) / (2 * h)
        );
    }

    /**
     * Evaluate the electric field at an exact native grid position.
     *
     * @param {number} i grid x-index
     * @param {number} j grid y-index
     * @param {Vec2} target output vector
     */
    valueAt(i, j, target) {
        const field = this._potentialField;

        if (i <= 0 || i >= field.nx - 1 || j <= 0 || j >= field.ny - 1)
            return target.set(0, 0);

        const h = this._derivativeSpacing;
        const dVdx = (field.valueAt(i + 1, j) - field.valueAt(i - 1, j)) / (2 * h);
        const dVdy = (field.valueAt(i, j + 1) - field.valueAt(i, j - 1)) / (2 * h);

        return target.set(-dVdx, -dVdy);
    }
}
