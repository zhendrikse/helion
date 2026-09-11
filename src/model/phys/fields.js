import { VectorField, DiscreteScalarField } from "../math/fields.js";
import { Vec2 } from "../math/math.js";
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
            throw new Error("Cannot calculate electric field without potential.");

        if (gridSpacing <= 0)
            throw new Error("gridSpacing must be > 0.");

        if (derivativeSpacing <= 0)
            throw new Error("derivativeSpacing must be > 0.");
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

/**
 * Electromagnetic field consisting of coupled electric and magnetic fields.
 */
export class ElectromagneticField {
    /**
     * @param {{
     * electric: VectorField,
     * magnetic: VectorField
     * }} options
     */
    constructor({ electric, magnetic }) {
        if (electric == null || magnetic == null)
            throw new Error("An ElectromagneticField requires electric and magnetic fields.");

        this.electric = electric;
        this.magnetic = magnetic;
    }

    /**
     * Create the electromagnetic field represented in another frame.
     *
     * @param {import("../../core/helion.js").Transformation} transformation
     * @returns {ElectromagneticField}
     */
    transformedBy(transformation) {
        return transformation.applyTo(this);
    }
}
