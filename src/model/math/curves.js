import {Interval, Vec2} from "./math.js";
import {MathPhysicsModelBehavior} from "../../core/helion.js";

/**
 * Mathematical definition of a parametrically defined curve.
 *
 * A parametric curve maps an interval to points in the plane:
 *
 *     γ : I → R²
 */
export class ParametricCurve extends MathPhysicsModelBehavior {
    /**
     * @param {{
     *   domain?: Interval
     *   func?: (t: number) => Vec2
     * }} options
     */
    constructor({
        domain = new Interval(-1, 1),
        func = t => new Vec2(t, 0)
    } = {}) {
        super();
        this.domain = domain;
        this._func = func;
    }

    /** @param {number} intervalResolution */
    rangeAt(intervalResolution) {
        const interval = new Interval();
        for (let i = 0; i < intervalResolution; i++) {
            const point = this._func(this.domain.scaleUnitParameter(i / intervalResolution));
            interval.include(point.y);
        }
        return interval;
    }

    /**
     * @param {number} u normalized parameter
     * @param {Vec2} target
     */
    sample(u, target = new Vec2()) {
        const point = this._func(this.domain.scaleUnitParameter(u));
        return target.copy(point);
    }
}
