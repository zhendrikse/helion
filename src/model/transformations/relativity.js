import { Transformation } from "../../core/helion.js";
import { ElectromagneticField, VectorField } from "../math/fields.js";
import { Vec3 } from "../math/math.js";

class LorentzFieldComponent extends VectorField {
    /**
     * @param {ElectromagneticField} field
     * @param {"electric" | "magnetic"} component
     * @param {LorentzTransform} transformation
     */
    constructor(field, component, transformation) {
        super();
        this._field = field;
        this._component = component;
        this._transformation = transformation;
        this._electric = new Vec3();
        this._magnetic = new Vec3();
    }

    sample(position, target) {
        this._field.electric.sample(position, this._electric);
        this._field.magnetic.sample(position, this._magnetic);
        this._transformation.transform(this._electric, this._magnetic, target, this._component);
        return target;
    }
}

/**
 * Lorentz transformation for electromagnetic fields.
 *
 * The boost is along the x-axis and beta = v/c. Electric and magnetic
 * fields are transformed together because their transverse components mix.
 */
export class LorentzTransform extends Transformation {
    constructor(beta = 0) {
        super();
        this._beta = beta;
    }

    get beta() { return this._beta; }

    /** @param {number} beta */
    set beta(beta) { this._beta = beta; }

    /**
     * Transform an electromagnetic field into the boosted frame.
     *
     * @param {ElectromagneticField} field
     * @returns {ElectromagneticField}
     */
    applyTo(field) {
        if (!(field instanceof ElectromagneticField))
            throw new Error("LorentzTransform can only be applied to an ElectromagneticField.");

        return new ElectromagneticField({
            electric: new LorentzFieldComponent(field, "electric", this),
            magnetic: new LorentzFieldComponent(field, "magnetic", this)
        });
    }

    /**
     * @param {Vec3} electric
     * @param {Vec3} magnetic
     * @param {Vec3} target
     * @param {"electric" | "magnetic"} component
     */
    transform(electric, magnetic, target, component) {
        const beta = this._beta;
        const gamma = 1 / Math.sqrt(1 - beta * beta);

        if (component === "electric") {
            target.set(
                electric.x,
                gamma * (electric.y - beta * magnetic.z),
                gamma * (electric.z + beta * magnetic.y)
            );
        } else {
            target.set(
                magnetic.x,
                gamma * (magnetic.y + beta * electric.z),
                gamma * (magnetic.z - beta * electric.y)
            );
        }

        return target;
    }
}
