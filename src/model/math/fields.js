import {MathPhysicsModelBehavior} from "../../core/helion.js";
import {Complex, Interval, Vec3, Vec2} from "./math.js";
import {DifferentialGeometry} from "./numerics/diffgeometry.js";

export class Domain {
    constructor(xRange=[-0.5, 0.5], yRange=[-0.5, 0.5]) {
        this.xRange = new Interval(xRange[0], xRange[1]);
        this.yRange = new Interval(yRange[0], yRange[1]);
    }
}

export class Field extends MathPhysicsModelBehavior {
    sample(u, v, target) {}
}

export class VectorField extends Field {
    sample(positionVector, target) {}
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
        return y * this.nx + x;
    }

    reset() {
        this.real = new Float32Array(this.nx * this.ny);
        this.imag = new Float32Array(this.nx * this.ny)
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
        // bilinear interpolation (kan later consistent op index() bouwen)
    }
}
