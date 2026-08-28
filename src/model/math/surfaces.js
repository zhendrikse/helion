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
}

export class DifferentiableSurface extends Surface {
    frameAt(u, v, target) {
        return this._differentialGeometry.differentialFrame(u, v, target);
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

export class ComplexFunctionSurface extends Surface {
    constructor({
        domain = new Domain(),
        func = z => new Complex(0, 0)
    } = {}) {
        super();
        this._domain = domain;
        this._complexFunction = func;
    }

    get func() { return this._complexFunction; }

    sample(u, v, target) {
        const re = this._domain.xRange.scaleUnitParameter(u);
        const im = this._domain.yRange.scaleUnitParameter(v);
        target.in.set(re, im);
        target.out.copy(this._complexFunction(new Complex(re, im)));
    }
}

export class DiscreteFieldSurface extends DifferentiableSurface {
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