import {DiscreteScalarField, Domain, Field, MultivariateFunction} from "./fields.js";
import {Interval, Vec2, Vec3} from "./math.js";
import {DifferentialFrame, DifferentialGeometry} from "./numerics/diffgeometry.js";
import {MathPhysicsModelBehavior} from "../../core/helion.js";
import { SurfaceResolution } from "../../view/3d/surfaces/visualization.js";

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

    /** @param {SurfaceResolution} resolution */
    sampleSpacing(resolution) {
        return new Vec2(1, 1);
    }

    /** 
     * @param {number} u 
     * @param {number} v 
     * @param {DifferentialFrame} target 
     */
    frameAt(u, v, target) {
        return this._differentialGeometry.differentialFrame(u, v, target);
    }

    /** @param {SurfaceResolution} resolution */
    rangeAt(resolution) {
        return new Interval();
    }

    /** 
     * @param {number} u 
     * @param {number} v 
     * @param {any} target 
     */
    sample(u, v, target) {
        return target;
    }
}

export class ScalarFieldSurface extends DifferentiableSurface {
    /**
     * @param {MultivariateFunction} multivariateFunction 
     */
    constructor(multivariateFunction) {
        super();
        this._function = multivariateFunction;
    }

    /** @param {SurfaceResolution} resolution */
    rangeAt(resolution) {
        return this._function.rangeAt(resolution);
    }

    /** 
     * @param {number} u 
     * @param {number} v 
     * @param {Vec3} target 
     */
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
    /**
     * @param {{
     *  domain?: Domain
     *  x?: (u: number, v: number) => number
     *  y?: (u: number, v: number) => number
     *  z?: (u: number, v: number) => number
     *  }} options 
     */
    constructor({
        domain = new Domain(),
        x = (u, v) => u,
        y = (u, v) => v,
        z = (u, v) => 0,
    } = {}) {
        super();
        this._domain = domain;
        this._x = x;
        this._y = y;
        this._z = z;
    }

    /** @param {SurfaceResolution} surfaceResolution */
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

    /** @param {SurfaceResolution} surfaceResolution */
    sampleSpacing(surfaceResolution) {
        const dx = this._domain.xRange.range / surfaceResolution.u;
        const dy = this._domain.yRange.range / surfaceResolution.v;

        return new Vec2(dx, dy);
    }

    /** 
     * @param {number} u 
     * @param {number} v 
     * @param {Vec3} target 
     */
    sample(u, v, target) {
        const uu = this._domain.xRange.scaleUnitParameter(u);
        const vv = this._domain.yRange.scaleUnitParameter(v);
        target.set(this._x(uu, vv), this._z(uu, vv), this._y(uu, vv));
    }
}

export class DiscreteFieldSurface extends DifferentiableSurface {
    /**
     * @param {DiscreteScalarField} field 
     */
    constructor(field) {
        super();
        this._field = field;
    }

    /** @param {SurfaceResolution} resolution */
    rangeAt(resolution) {
        return this._field.rangeAt();
    }

    /** 
     * @param {number} u 
     * @param {number} v 
     * @param {DifferentialFrame} target 
     */
    frameAt(u, v, target) {
        const i = u * (this._field.nx - 1);
        const j = v * (this._field.ny - 1);

        const ii = Math.floor(i);
        const jj = Math.floor(j);

        const z = this._field.valueAt(ii, jj);
        target.position.set(i, z, j);

        this._normalAt(ii, jj, target.normal);
        return target;
    }

    /** 
     * @param {number} i 
     * @param {number} j 
     * @param {Vec3} target 
     */
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

