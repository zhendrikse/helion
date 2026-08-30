import {MathPhysicsModelBehavior} from "../../core/helion.js";
import {Complex, Interval, Vec3} from "./math.js";
import {DifferentiableSurface} from "./surfaces.js";

export class Domain {
    constructor(xRange=[-0.5, 0.5], yRange=[-0.5, 0.5]) {
        this.xRange = new Interval(xRange[0], xRange[1]);
        this.yRange = new Interval(yRange[0], yRange[1]);
    }
}

/**
 * TODO !!
 *
 * Field
 * ├── ScalarField → number
 * │   ├── MultivariateFunction
 * │   ├── DiscreteScalarField
 * │   └── NormalizedScalarField
 * │
 * ├── ComplexField → Complex
 * │   ├── ComplexFunction
 * │   └── DiscreteComplexField
 * │
 * └── VectorField → Vec3
 *
 * ScalarField  (composition) ──────► Surface
 * ComplexField (composition) ──────► ComplexSurface
 * VectorField  (composition) ──────► VectorVisualization
 */
export class Field extends MathPhysicsModelBehavior {
    sample(u, v, target) {}
}

export class ScalarField extends Field {
    sample(u, v) {
        return 0;
    }
}

export class ComplexField extends Field {
    sample(u, v, target) {
        target.set(new Complex(), new Complex()); // Real, imag
        return target;
    }
}

export class VectorField extends Field {
    sample(positionVector, target) {
        target.set(0, 0, 0);
        return target;
    }
}

export class MultivariateFunction extends ScalarField {
    constructor({
        domain = new Domain(),
        func = (x, y, t) => 0
    } = {}) {
        super();
        this.domain = domain;
        this._time = 0;
        this._func = func;
    }

    sample(u, v) {
        const x = this.domain.xRange.scaleUnitParameter(u);
        const y = this.domain.yRange.scaleUnitParameter(v);
        return this._func(x, y, this._time);
    }

    set time(time) { this._time = time; }
}

export class ComplexFunction extends ComplexField {
    constructor({
        domain = new Domain(),
        func = z => new Complex(0, 0)
    } = {}) {
        super();
        this._domain = domain;
        this._complexFunction = func;
        this._tempComplexNumber = new Complex();
    }

    sample(u, v, target) {
        const re = this._domain.xRange.scaleUnitParameter(u);
        const im = this._domain.yRange.scaleUnitParameter(v);
        this._tempComplexNumber.set(re, im);
        target.in.copy(this._tempComplexNumber);
        target.out.copy(this._complexFunction(this._tempComplexNumber));
    }
}

/**
 * Discrete scalar field, i.e. a scalar field on a grid.
 */
export class DiscreteScalarField extends ScalarField {
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
        return this;
    }

    get data() {
        return this._data;
    }

    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }

    sample(u, v) {
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
        real = new Float64Array(nx * ny),
        imag = new Float64Array(nx * ny)
    } = {}) {
        super();
        this.real = real;
        this.imag = imag;
        this.nx = nx;
        this.ny = ny;
    }

    get size() { return this.nx; }

    index(x, y) {
        return y * this.nx + x;
    }

    reset() {
        this.real = new Float64Array(this.nx * this.ny);
        this.imag = new Float64Array(this.nx * this.ny)
        return this;
    }

    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }

    valueAt(i, j, target) {
        target.re = this.real[this.index(i, j)];
        target.im = this.imag[this.index(i, j)];
    }

    sample(u, v, target) {
        // bilinear interpolation
        const x = u * (this._nx - 1);
        const y = v * (this._ny - 1);

        const x0 = Math.floor(x);
        const y0 = Math.floor(y);

        const x1 = Math.min(x0 + 1, this._nx - 1);
        const y1 = Math.min(y0 + 1, this._ny - 1);

        const tx = x - x0;
        const ty = y - y0;

        const i00 = this.index(x0, y0);
        const i10 = this.index(x1, y0);
        const i01 = this.index(x0, y1);
        const i11 = this.index(x1, y1);

        const r0 = this.real[i00] * (1 - tx) + this.real[i10] * tx;
        const r1 = this.real[i01] * (1 - tx) + this.real[i11] * tx;
        const i0 = this.imag[i00] * (1 - tx) + this.imag[i10] * tx;
        const i1 = this.imag[i01] * (1 - tx) + this.imag[i11] * tx;

        target.re = r0 * (1 - ty) + r1 * ty;
        target.im = i0 * (1 - ty) + i1 * ty;

        return target;
    }
}
