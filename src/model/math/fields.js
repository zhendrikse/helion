import {MathPhysicsModelBehavior, Registry} from "../../core/helion.js";
import {Complex, Interval, Vec3} from "./math.js";
import {
    InfernoColorMapper, RdYlBuColorMapper, ScientificColorMapper, SeismicColorMapper, ViridisColorMapper
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

/**
 * Mathematical definition of a surface.
 */
export class Surface extends Field {
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

    sample(u, v, target) {
        const i = Math.floor(u * (this._field.nx - 1));
        const j = Math.floor(v * (this._field.ny - 1));
        const z = this._field.valueAt(i, j);
        target.set(i, z, j);
    }

    normalAt(i, j, target) {
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

export class ScalarFieldOnSurface extends Field {
    constructor(surface) {
        super();
        if (!surface)
            throw new Error("Cannot initialize a scalar field on a surface that is null!");
        this._surface = surface;
    }

    get recommendedColorMapper() {}
}

export class HeightScalarField extends ScalarFieldOnSurface {
    sample(u, v, target) {
        this._surface.sample(u, v, target);
        target.set(u, v, target.y);
    }

    get recommendedColorMapper() {
        return new InfernoColorMapper();
    }
}

export class MeanCurvatureField extends ScalarFieldOnSurface {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    get recommendedColorMapper() {
        return new ScientificColorMapper();
    }

    sample(u, v, target) {
        target.set(u, v, this._geometry.normalMeanGaussian(u, v).H);
    }
}

export class GaussianCurvatureField extends ScalarFieldOnSurface {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    get recommendedColorMapper() {
        return new SeismicColorMapper();
    }

    sample(u, v, target) {
        target.set(u, v, this._geometry.normalMeanGaussian(u, v).K);
    }
}

export class PrincipalCurvatureField extends ScalarFieldOnSurface {
    constructor(surface, which=1) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
        this._which = which;
    }

    get recommendedColorMapper() {
        return this._which === 1 ? new ViridisColorMapper() : new InfernoColorMapper();
    }

    sample(u, v, target) {
        const { k1, k2 } = this._geometry.principals(u, v);
        target.set(u, v, this._which === 1 ? k1 : k2);
    }
}

export class ShapeIndexField extends ScalarFieldOnSurface {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    get recommendedColorMapper() {
        return new RdYlBuColorMapper();
    }

    sample(u, v, target) {
        const { k1, k2 } = this._geometry.principals(u, v);
        const denominator = k1 - k2;

        if (Math.abs(denominator) < 1e-12)
            return 0;

        target.set(u, v, (2 / Math.PI) * Math.atan((k1 + k2) / denominator));
    }
}

export class CurvednessField extends ScalarFieldOnSurface {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    get recommendedColorMapper() {
        return new ViridisColorMapper();
    }

    sample(u, v, target) {
        const { k1, k2 } =  this._geometry.principals(u, v);
        target.set(u, v, Math.sqrt(0.5 * (k1 * k1 + k2 * k2)));
    }
}

export const SurfaceScalarFields = new Registry({
    id: "surfaceScalarFieldSelect",
    label: "Surface field ",
    entries: {
        Height: surface => new HeightScalarField(surface),
        MeanCurvature: surface => new MeanCurvatureField(surface),
        PrincipalCurvature1: surface => new PrincipalCurvatureField(surface,1),
        PrincipalCurvature2: surface => new PrincipalCurvatureField(surface,2),
        GaussianCurvature: surface => new GaussianCurvatureField(surface),
        ShapeIndex: surface => new ShapeIndexField(surface),
        Curvedness: surface => new CurvednessField(surface)
    }
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

    index(x, y) {
        return y * this._nx + x;
    }

    valueAt(x, y) {
        return this._data[this.index(x, y)];
    }

    setValueAt(x, y, value) {
        this._data[this.index(x, y)] = value;
    }

    reset() {
        this._data.fill(0);
    }

    get data() {
        return this._data;
    }

    apply(operator) {
        operator.apply(this);
        return this;
    }

    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }

    sample(u, v, target) {
        // bilinear interpolation (kan later consistent op index() bouwen)
    }
}

/**
 * Discrete complex scalar field, i.e. a complex scalar field on a grid.
 */
export class DiscreteComplexField extends Field {
    constructor({
        nx = 128,
        ny = 128,
        real = new Float32Array(nx * ny),
        imag = new Float32Array(nx * ny)
    } = {}) {
        super();
        this.real = real;
        this.imag = imag;
        this.nx = nx;
        this.ny = ny;
    }

    get size() { return this.nx; }

    apply(operator) {
        operator.apply(this);
        return this;
    }

    index(x, y) {
        return y * this._nx + x;
    }

    reset() {
        this.real = new Float32Array(this.nx * this.ny);
        this.imag = new Float32Array(this.nx * this.ny)
    }

    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }

    sample(i, j, target) {
        target.re = this.real[this.index(i, j)];
        target.im = this.imag[this.index(i, j)];
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
