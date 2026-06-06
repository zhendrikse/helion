import { MathPhysicsModelBehavior} from "../../core/helion.js";
import { Interval, Vec3 } from "./math.js";
import {
    InfernoColorMapper,
    JetColorMapper,
    RdYlBuColorMapper,
    SeismicColorMapper,
    ViridisColorMapper
} from "../../view/colormappers.js";
import {DifferentialGeometry} from "./numerics/diffgeometry.js";

export class Domain {
    constructor(xRange=[-0.5, 0.5], yRange=[-0.5, 0.5]) {
        this.xRange = new Interval(xRange[0], xRange[1]);
        this.yRange = new Interval(yRange[0], yRange[1]);
    }
}

/**
 * Generic field type.
 *
 * Field
 *  ├─ Surface
 *  │   ├─ ParametricSurface
 *  │   └─ MultivariateFunctionSurface
 *  │
 *  ├─ HeightScalarField
 *  ├─ MeanCurvatureField
 *  ├─ GaussianCurvatureField
 *  ├─ ...
 *  │
 *  └─ DiscreteScalarField
 */
export class Field extends MathPhysicsModelBehavior {
    sample(u, v, target) {}
}

export class VectorField extends Field {
    sample(positionVector, target) {}
}

export class FieldStatistics {
    static max(scalarField) {
        let max = -Infinity;

        for (let i = 0; i < scalarField.nx; i++)
            for (let j = 0; j < scalarField.ny; j++) {
                const value = scalarField.valueAt(i, j);
                if (value > max)
                    max = value;
            }

        return max;
    }

    static maxMagnitude(field) {
        let max = 0;
        for (let i = 0; i < field.nx; i++)
            for (let j = 0; j < field.ny; j++)
                if (field.magnitudeAt(i, j) > max)
                    max = field.magnitudeAt(i, j);

        return max;
    }
}

/**
 * Mathematical definition of a surface. This class has a role
 * to play in the semantic domain of mathematics. It happens
 * to have the characteristics of a field in its implementation.
 */
export class Surface extends Field {}

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

export class ScalarFieldSurface extends Surface {
    constructor(field) {
        super();
        this._field = field;
    }

    sample(u, v, target) {
        const i = Math.floor(u * (this._field.nx - 1));
        const j = Math.floor(v * (this._field.ny - 1));
        const z = this._field.valueAt(i, j);
        target.set(i, z, j);
    }
}

export class HeightScalarField extends Field {
    constructor() {
        super();
    }

    set surface(newSurface) {
        this._surface = newSurface;
    }

    sample(u, v, target) {
        this._surface.sample(u, v, target);
        target.set(u, v, target.y);
    }

    get recommendedColorMapper() {
        return new InfernoColorMapper();
    }
}

export class MeanCurvatureField extends Field {
    constructor() {
        super();
        this._geometry = null;
    }

    get recommendedColorMapper() {
        return new JetColorMapper();
    }

    set surface(newSurface) {
        this._surface = newSurface;
        this._geometry = new DifferentialGeometry(newSurface);
    }

    sample(u, v, target) {
        target.set(u, v, this._geometry.normalMeanGaussian(u, v).H);
    }
}

export class GaussianCurvatureField extends Field {
    constructor() {
        super();
        this._geometry = null;
    }

    get recommendedColorMapper() {
        return new SeismicColorMapper();
    }

    set surface(newSurface) {
        this._surface = newSurface;
        this._geometry = new DifferentialGeometry(newSurface);
    }

    sample(u, v, target) {
        target.set(u, v, this._geometry.normalMeanGaussian(u, v).K);
    }
}

export class PrincipalCurvatureField extends Field {
    constructor(which = 1) {
        super();
        this._geometry = null;
        this._which = which;
    }

    get recommendedColorMapper() {
        return this._which === 1 ? new ViridisColorMapper() : new InfernoColorMapper();
    }

    set surface(newSurface) {
        this._surface = newSurface;
        this._geometry = new DifferentialGeometry(newSurface);
    }

    sample(u, v, target) {
        const { k1, k2 } = this._geometry.principals(u, v);
        target.set(u, v, this._which === 1 ? k1 : k2);
    }
}

export class ShapeIndexField extends Field {
    constructor() {
        super();
        this._geometry = null;
    }

    get recommendedColorMapper() {
        return new RdYlBuColorMapper();
    }

    set surface(newSurface) {
        this._surface = newSurface;
        this._geometry = new DifferentialGeometry(newSurface);
    }

    sample(u, v, target) {
        const { k1, k2 } = this._geometry.principals(u, v);
        const denominator = k1 - k2;

        if (Math.abs(denominator) < 1e-12)
            return 0;

        target.set(u, v, (2 / Math.PI) * Math.atan((k1 + k2) / denominator));
    }
}

export class CurvednessField extends Field {
    constructor() {
        super();
        this._geometry = null;
    }

    set surface(newSurface) {
        this._surface = newSurface;
        this._geometry = new DifferentialGeometry(newSurface);
    }

    get recommendedColorMapper() {
        return new ViridisColorMapper();
    }

    sample(u, v, target) {
        const { k1, k2 } =  this._geometry.principals(u, v);
        target.set(u, v, Math.sqrt(0.5 * (k1 * k1 + k2 * k2)));
    }
}

export const SurfaceScalarFields = Object.freeze({
    Height: new HeightScalarField(),
    MeanCurvature: new MeanCurvatureField(),
    PrincipalCurvature1: new PrincipalCurvatureField(1),
    PrincipalCurvature2: new PrincipalCurvatureField(2),
    GaussianCurvature: new GaussianCurvatureField(),
    ShapeIndex: new ShapeIndexField(),
    Curvedness: new CurvednessField()
});


/**
 * This is the “adapter” between the physics and rendering.
 */
export class NormalizedScalarField extends Field {
    constructor(scalarField, normalizer) {
        super();
        this._scalarField = scalarField;
        this._normalizer = normalizer;
        this._target = new Vec3();
    }

    reset() { this._normalizer.reset?.(); }

    sample(u, v, target) {
        this._scalarField.sample(u, v, this._target);
        this._normalizer.observe?.(this._target.z);
        target.set(u, v, this._normalizer.normalize(this._target.z));
    }
}

/**
 * Discrete scalar field, i.e. a scalar field on a grid.
 */
export class DiscreteScalarField extends Field {
    constructor({
        nx = 100,
        ny = 100
    } = {}) {
        super();
        this._nx = nx;
        this._ny = ny;
        this._data = new Float32Array(nx * ny);
    }

    get nx() { return this._nx; }
    get ny() { return this._ny; }

    sample(u, v, target) {
        // bilinear interpolation
    }

    get data() {
        return this._data;
    }

    apply(operator) {
        operator.apply(this);
        return this;
    }

    valueAt(i, j) {
        return this._data[i + this._nx * j];
    }

    setValueAt(i, j, value) {
        this._data[i + this._nx * j] = value;
    }
}

/**
 * Discrete complex scalar field, i.e. a complex scalar field on a grid.
 */
export class DiscreteComplexField extends MathPhysicsModelBehavior {
    constructor({
        nx = 128,
        ny = 128,
        real = Array.from({ length: nx },() => new Float32Array(ny)),
        imag = Array.from({ length: nx },() => new Float32Array(ny)),
    } = {}) {
        super();
        this.real = real;
        this.imag = imag;
        this.nx = nx;
        this.ny = ny;
    }

    phaseAt(i, j) {
        const re = this.real[i][j];
        const im = this.imag[i][j];
        return Math.atan2(im, re); // [-π, π]
    }

    magnitudeAt(i, j) {
        const re = this.real[i][j];
        const im = this.imag[i][j];
        return Math.sqrt(re * re + im * im);
    }

    apply(transformation) {
        transformation(this);
        return this;
    }
}

// export class PrincipalDirectionField extends SurfaceVectorField {
//     constructor(which = 1) {
//         super();
//
//         this._which = which;
//         this._geometry = null;
//     }
//
//     set surface(surface) {
//         this._surface = surface;
//         this._geometry = new DifferentialGeometry(surface);
//     }
//
//     vectorValueAt(u, v, target) {
//         const frame = this._geometry.principalFrame(u, v);
//
//         if (!frame)
//             return target.set(0, 0, 0);
//
//         return target.copy(this._which === 1 ? frame.d1 : frame.d2);
//     }
// }
