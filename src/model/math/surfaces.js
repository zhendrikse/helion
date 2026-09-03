import {Domain} from "./fields.js";
import {Interval, Vec2} from "./math.js";
import {DifferentialGeometry} from "./numerics/diffgeometry.js";
import {MathPhysicsModelBehavior} from "../../core/helion.js";

/**
 * Mathematical definition of a surface.
 */
export class Surface extends MathPhysicsModelBehavior {
}

export class DifferentiableSurface extends Surface {
    constructor() {
        super();
        this._differentialGeometry = new DifferentialGeometry(this);
    }

    sampleSpacing(resolution) {
        return new Vec2(1, 1);
    }

    frameAt(u, v, target) {
        return this._differentialGeometry.differentialFrame(u, v, target);
    }

    rangeAt(resolution) {
        return new Interval();
    }
}

export class ScalarFieldSurface extends DifferentiableSurface {
    constructor(multivariateFunction) {
        super();
        this._function = multivariateFunction;
    }

    rangeAt(resolution) {
        return this._function.rangeAt(resolution);
    }

    sample(u, v, target) {
        const x = this._function.domain.xRange.scaleUnitParameter(u);
        const y = this._function.domain.yRange.scaleUnitParameter(v);
        target.set(x, this._function.sample(u, v), y);
    }
}

/**
 * A 2D surface defined as (u, v) => (x, y, z)
 */
export class ParametricSurface extends DifferentiableSurface {
    constructor({
        domain = new Domain(),
        x = (u, v) => u,
        y = (u, v) => v,
        z = (u, v) => 0
    } = {}) {
        super();
        this._domain = domain;
        this._x = x;
        this._y = y;
        this._z = z;
    }

    rangeAt(surfaceResolution) {
        const interval = new Interval();
        for (let i = 0; i < surfaceResolution.u; i++)
            for (let j = 0; j < surfaceResolution.v; j++)
                interval.include(this._z(
                    this._domain.xRange.scaleUnitParameter(i / surfaceResolution.u),
                    this._domain.yRange.scaleUnitParameter(j / surfaceResolution.v)
                ));
        return interval;
    }

    sampleSpacing(resolution) {
        const dx = this._domain.xRange.range / resolution.u;
        const dy = this._domain.yRange.range / resolution.v;

        return new Vec2(dx, dy);
    }

    sample(u, v, target) {
        const uu = this._domain.xRange.scaleUnitParameter(u);
        const vv = this._domain.yRange.scaleUnitParameter(v);
        target.set(this._x(uu, vv), this._z(uu, vv), this._y(uu, vv));
    }
}

export class DiscreteFieldSurface extends DifferentiableSurface {
    constructor(field) {
        super();
        this._field = field;
    }

    rangeAt(resolution) {
        return this._field.rangeAt(resolution);
    }

    frameAt(u, v, target) {
        const i = u * (this._field.nx - 1);
        const j = v * (this._field.ny - 1);

        const ii = Math.floor(i);
        const jj = Math.floor(j);

        const z = this._field.valueAt(ii, jj);
        target.position.set(i, z, j);

        this._normalAt(ii, jj, target.normal);
    }

    _normalAt(i, j, target) {
        const hL = this._field.valueAt(i - 1, j);
        const hR = this._field.valueAt(i + 1, j);
        const hD = this._field.valueAt(i, j - 1);
        const hU = this._field.valueAt(i, j + 1);

        const dHx = (hR - hL) * .5;
        const dHy = (hU - hD) * .5;

        target.set(-dHx, 1.0, -dHy).normalize();
    }

    reset() {
        this._field.reset();
    }
}

