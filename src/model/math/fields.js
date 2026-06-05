import { MathPhysicsModelBehavior } from "../../core/helion.js";
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

    transformWith(transformation) {
        transformation(this);
        return this;
    }
}


// export class SurfaceVectorField {
//     constructor() {
//         this._surface = null;
//     }
//
//     set surface(surface) {
//         this._surface = surface;
//     }
//
//     vectorValueAt(u, v, target) {
//         throw new Error("Not implemented");
//     }
// }
//
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
//
// export class PDESurfaceField extends SurfaceScalarField {
//     constructor({
//                     resolution = 50
//                 } = {}) {
//         super();
//         this._resolution = resolution;
//         this._u = this._createGrid(resolution);
//         this._uPrev = this._createGrid(resolution);
//         this._uNext = this._createGrid(resolution);
//         this._time = 0;
//     }
//
//     _createGrid(n) {
//         return Array.from({ length: n }, () => new Float32Array(n));
//     }
//
//     update(dt) {
//         this._time += dt;
//         this.step(dt);
//         this._swap();
//     }
//
//     _swap() {
//         const tmp = this._uPrev;
//         this._uPrev = this._u;
//         this._u = this._uNext;
//         this._uNext = tmp;
//     }
//
//     // override in subclass
//     step(dt) {
//         throw new Error("step(dt) must be implemented in each concrete PDE surface");
//     }
//
//     valueAt(i, j) { return this._u[i][j]; }
//
//     size() { return this._resolution; }
// }
//
// export class FiniteDifferenceMethodField extends PDESurfaceField{
//     constructor({
//                     resolution = 100,
//                     damping = 0.999,
//                     waveSpeed = 2
//                 } = {}) {
//         super({resolution});
//         this._c = waveSpeed
//         this._damping = damping;
//         this._init();
//     }
//
//     _init() {
//         for (let i = 0; i < this._resolution; i++)
//             for (let j = 0; j < this._resolution; j++) {
//                 const x = i / this._resolution;
//                 const y = j / this._resolution;
//
//                 this._u[i][j] = Math.sin(10 * x) * Math.cos(10 * y);
//                 this._uPrev[i][j] = this._u[i][j];
//             }
//     }
//
//     step(dt) {
//         const resolution = this._resolution;
//         const c2 = this._c * this._c;
//         const dt_dt_c2 = dt * dt * c2;
//         for (let i = 1; i < resolution - 1; i++)
//             for (let j = 1; j < resolution - 1; j++) {
//                 const laplacian =
//                     this._u[i+1][j] + this._u[i-1][j] + this._u[i][j+1] + this._u[i][j-1] - 4 * this._u[i][j];
//                 this._uNext[i][j] = 2 * this._u[i][j] - this._uPrev[i][j] + dt_dt_c2 * laplacian;
//                 this._uNext[i][j] *= this._damping;
//             }
//
//         this._applyBoundary();
//     }
//
//     _applyBoundary() {
//         const n = this._resolution - 1;
//         for (let i = 0; i < this._resolution; i++) {
//             this._uNext[0][i] = 0;
//             this._uNext[n][i] = 0;
//             this._uNext[i][0] = 0;
//             this._uNext[i][n] = 0;
//         }
//     }
//
// }
//
// /**
//  * Partial different equation surface, a dynamic surface governed by a partial differential equation.
//  */
// export class PDESurface { //extends Surface {
//     constructor({
//                     field,
//                     width = 10,
//                     depth = 10
//                 } = {}) {
//         //super();
//         this._field = field;
//         this._width = width;
//         this._depth = depth;
//     }
//
//     update(dt) {
//         this._field.update(dt);
//     }
//
//     sample(u, v, target) {
//         const i = Math.floor(u * (this._field.size() - 1));
//         const j = Math.floor(v * (this._field.size() - 1));
//         const x = (u - 0.5) * this._width;
//         const z = (v - 0.5) * this._depth;
//
//         target.set(x, this._field.valueAt(i, j), z);
//     }
// }