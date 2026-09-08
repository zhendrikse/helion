import { DiscreteScalarField } from "../../math/fields.js";
import { Vec2 } from "../../math/math.js";

export class ScalarFieldCalculus {
    /** @param {DiscreteScalarField } field */
    constructor(field) {
        this._field = field;
    }

    /**
     * Evaluate the divergence at an exact native grid position.
     *
     * @param {number} i grid x-index
     * @param {number} j grid y-index
     * @param {number} h grid spacing
     * @param {Vec2} target output vector
     * @returns {Vec2}
     */
    gradient(i, j, h, target) {
        if (i <= 0 || i >= this._field.nx - 1 ||
            j <= 0 || j >= this._field.ny - 1) 
            return target.set(0, 0, 0);

        const dVdx = (this._field.valueAt(i + 1, j) - this._field.valueAt(i - 1, j)) / (2 * h);
        const dVdy = (this._field.valueAt(i, j + 1) - this._field.valueAt(i, j - 1)) / (2 * h);

        return target.set(dVdx, dVdy, 0);
    }
}