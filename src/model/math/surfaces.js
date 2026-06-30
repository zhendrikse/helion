import {Domain} from "./fields.js";
import {Complex, Vec2} from "./math.js";
import {DifferentialGeometry} from "./numerics/diffgeometry.js";
import {MathPhysicsModelBehavior} from "../../core/helion.js";

/**
 * Mathematical definition of a surface.
 */
export class Surface extends MathPhysicsModelBehavior {
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
}

/**
 * A 2D surface defined as (u, v) => (x, y, z)
 */
export class ParametricSurface extends Surface {
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

/**
 * A 2D surface defined as f(x, y, t) = z
 */
export class MultivariateFunctionSurface extends ParametricSurface {
    constructor({
                    domain = new Domain(),
                    z = (x, y, t) => 0
                } = {}) {
        super({domain, z});
        this._time = 0;
    }

    sample(u, v, target) {
        const uu = this._domain.xRange.scaleUnitParameter(u);
        const vv = this._domain.yRange.scaleUnitParameter(v);
        target.set(this._x(uu, vv), this._z(uu, vv, this._time), this._y(uu, vv));
    }

    set time(time) { this._time = time; }
}

export class ComplexSurface extends Surface {
    constructor({
        domain = new Domain(),
        z = (c) => new Complex(0, 0)
    } = {}) {
        super();
        this._domain = domain;
        this._x = (u, v) => u;
        this._y = (u, v) => v;
        this._z = z;

        this._complexNumber = new Complex();
    }

    sample(u, v, target) {
        target.re = this._domain.xRange.scaleUnitParameter(u);
        target.im = this._domain.yRange.scaleUnitParameter(v);
        this._complexNumber = this._z(target);
        target.re = this._complexNumber.re;
        target.im = this._complexNumber.im;
    }
}

export class DiscreteFieldSurface extends Surface {
    constructor(field) {
        super();
        this._field = field;
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