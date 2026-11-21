import { ModelObject } from '../behavior.js';
import { Complex, Interval } from './math.js';
import { Vec2, Vec3 } from './objects.js';
import { Solver } from './numerics/solvers/solvers.js';
import { SurfaceResolution } from '../../view/3d/surfaces/visualization.js'

export class Domain {
    /**
     * Represents a 2D domain for multivariate functions.
     *
     * The domain defines the x and y coordinate ranges over which
     * functions are evaluated.
     *
     * @param {number[]} [xRange=[-0.5, 0.5]] - X-axis range [min, max]
     * @param {number[]} [yRange=[-0.5, 0.5]] - Y-axis range [min, max]
     *
     * @throws {Error} If xRange[0] === xRange[1] or yRange[0] === yRange[1]
     *
     * @example
     * const d = new Domain([0, 1], [0, 1]); // Unit square domain
     */
    constructor(xRange=[-0.5, 0.5], yRange=[-0.5, 0.5]) {
        if (xRange[0] === xRange[1] || yRange[0] === yRange[1])
            throw new Error(`Invalid domain [${xRange[0]}, ${xRange[1]}] to [${yRange[0]}, ${yRange[1]}]`);
        this.xRange = new Interval(xRange[0], xRange[1]);
        this.yRange = new Interval(yRange[0], yRange[1]);
    }
}

/**
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
export class Field extends ModelObject {
    /**
     * Base class for all field types (scalar, complex, vector).
     *
     * Fields represent functions f(u, v) or f(x, y, z) that can be
     * sampled, have a range, and be visualized.
     *
     * @param {number} u - Normalized coordinate 1 (e.g., x position in [0,1])
     * @param {number} v - Normalized coordinate 2 (e.g., y position in [0,1])
     * @param {any} [target] - Optional object to store the result in
     *
     * @returns {any} Sampled value: number for ScalarField, Complex for ComplexField, Vec3 for VectorField
     *
     * @example
     * const field = new ScalarField();
     * const val = field.sample(0.5, 0.5); // Returns 0 (default implementation)
     */
    sample(u, v, target) {}
}

export class ScalarField extends Field {
    /**
     * Scalar field representing a function f(u, v) → R.
     *
     * Scalar fields can be sampled at normalized coordinates (u, v) ∈ [0,1]²,
     * have a range at a given resolution, and can be visualized as surfaces.
     *
     * @param {number} u - Normalized coordinate 1 (typically in [0, 1])
     * @param {number} v - Normalized coordinate 2 (typically in [0, 1])
     * @param {any} [target] - Optional object to store the result in
     *
     * @returns {number} Sampled scalar value
     *
     * @example
     * const field = new DiscreteScalarField({nx: 10, ny: 10});
     * const val = field.sample(0.5, 0.5); // Returns value at grid point (5,5)
     */
    /**
     * @abstract
     * @param {number} u normalized coordinate one.
     * @param {number} v normalized coordinate two.
     */
    sample(u, v) {
        return 0;
    }

    /**
     * @abstract
     * @param {SurfaceResolution} resolution
     * @param {number} time
     * @returns {Interval}
     */
    rangeAt(resolution, time=0) {}
}

export class ComplexField extends Field {
    /**
     * @abstract
     * @param {number} u normalized coordinate one.
     * @param {number} v normalized coordinate two.
     * @param {ComplexFunctionSample} _target
     */
    sample(u, v, _target) {
    }
}

export class VectorField extends ModelObject {
    /**
     * @param {Vec2 | Vec3} positionVector
     * @param {Vec2 | Vec3} target
     * @return { Vec2 | Vec3 }
     */
    sample(positionVector, target) {
        target.set(0, 0, 0);
        return target;
    }
}

export class DiscreteVectorField extends VectorField {
    /**
     * @param {{
     *  nx?: number,
     *  ny?: number
     *  gridSpacing,
     * }} [options]
     */
    constructor({
        nx = 100,
        ny = 100,
        gridSpacing = 1,
    } = {}) {
        super();

        if (gridSpacing <= 0)
            throw new Error('gridSpacing must be > 0.');

        this._nx = nx;
        this._ny = ny;
        this._gridSpacing = gridSpacing;
        this._vectorComponentX = new DiscreteScalarField({nx, ny});
        this._vectorComponentY = new DiscreteScalarField({nx, ny});
        this._vectorComponentZ = new DiscreteScalarField({nx, ny});
    }

    resize(nx, ny) {
        this._nx = nx;
        this._ny = ny;
        this._vectorComponentX = new DiscreteScalarField({ nx, ny });
        this._vectorComponentY = new DiscreteScalarField({ nx, ny });
        this._vectorComponentZ = new DiscreteScalarField({ nx, ny });
    }

    get nx() { return this._nx; }
    get ny() { return this._ny; }
    get gridSpacing() { return this._gridSpacing; }

    valueAt(/** @type {number} */ i, /** @type {number} */ j, /** @type {Vec2 | Vec3} */ target) {
        target.set(
            this._vectorComponentX.valueAt(i, j),
            this._vectorComponentY.valueAt(i, j),
            this._vectorComponentZ.valueAt(i, j)
        );
        return target;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    index(x, y) {
        return y * this._nx + x;
    }

    reset() {
        this._vectorComponentX.reset();
        this._vectorComponentY.reset();
        this._vectorComponentZ.reset();
        return this;
    }
}

export class MultivariateFunction extends ScalarField {
    /**
     * @param {{
     *  domain?: Domain
     *  func?: (x: number, y: number, t: number) => number
     * }} [options]
     */
    constructor({
        domain = new Domain(),
        func = (_x, _y, _t) => 0
    } = {}) {
        super();
        this.domain = domain;
        this._time = 0;
        this._func = func;
    }

    /**
     * @param {SurfaceResolution} surfaceResolution
     * @param {number} time
     * @returns {Interval}
     */
    rangeAt(surfaceResolution, time = 0) {
        const interval = new Interval(Infinity, -Infinity);
        const uSteps = surfaceResolution.u;
        const vSteps = surfaceResolution.v;
        for (let i = 0; i < uSteps; i++)
            for (let j = 0; j < vSteps; j++) {
                interval.include(this._func(
                    this.domain.xRange.scaleUnitParameter(i / (uSteps - 1)),
                    this.domain.yRange.scaleUnitParameter(j / (vSteps - 1)),
                    time
                ));
            }

        return interval;
    }

    /**
     * @param {number} u
     * @param {number} v
     */
    sample(u, v) {
        const x = this.domain.xRange.scaleUnitParameter(u);
        const y = this.domain.yRange.scaleUnitParameter(v);
        return this._func(x, y, this._time);
    }

    /** @param {number} time */
    set time(time) { this._time = time; }
}

/**
 * Real function f: R → R
 */
export class RealFunction extends ModelObject {
    /**
     * @param {{
     *  func?: (x: number) => number,
     *  domain?: Interval
     * }} [options]
     */
    constructor({
        domain = new Interval(-1, 1),
        func = _x => 0
    } = {}) {
        super();
        this.domain = domain;
        this._func = func;
    }

    integrate(samples = 1000) {
        const dx = this.domain.range / samples;
        let sum = 0;
        for (let i = 0; i < samples; i++) {
            const x = this.domain.from + (i + 0.5) * dx;
            sum += this._func(x);
        }

        return sum * dx;
    }

    /** @param {number} intervalResolution */
    rangeAt(intervalResolution) {
        const interval = new Interval(Infinity, -Infinity);
        for (let i = 0; i < intervalResolution; i++)
            interval.include(this._func(this.domain.scaleUnitParameter(i / (intervalResolution - 1))));
        return interval;
    }

    /** @param {(x: number) => number} func */
    setFunction(func) { this._func = func; }

    /**
     * @param {number} u
     * @param {Vec2} target
     */
    sample(u, target = new Vec2()) {
        const x = this.domain.scaleUnitParameter(u);
        const value = this._func(x);
        target.set(x, value);
        return value;
    }
}

export class ComplexFunctionSample {
    /**
     * Holds input and output complex values for ComplexFunction sampling.
     *
     * Used by ComplexFieldViewable2D and similar views to sample complex functions.
     *
     * @property {Complex} input - Input complex number z = x + yi
     * @property {Complex} output - Output complex number f(z)
     *
     * @example
     * const sample = new ComplexFunctionSample();
     * sample.input.set(1, 2); // z = 1 + 2i
     * complexFunction.sample(0.5, 0.5, sample);
     * const output = sample.output; // f(1+2i)
     */
    constructor() {
        this.input = new Complex();
        this.output = new Complex();
    }

    /**
     * Phase of the output complex number, in cycles [−0.5, 0.5].
     *
     * @returns {number} Phase in cycles
     *
     * @example
     * sample.phase // Returns phase of output
     */
    get phase() { return Math.atan2(this.output.im, this.output.re) / (2* Math.PI); }
    /**
     * Squared absolute value of the output.
     *
     * @returns {number} |output|²
     *
     * @example
     * sample.absSquared // Returns |output| squared
     */
    get absSquared() { return this.output.re * this.output.re + this.output.im * this.output.im; }
    /**
     * Absolute value (magnitude) of the output.
     *
     * @returns {number} |output|
     *
     * @example
     * sample.magnitude // Returns |output|
     */
    get magnitude() { return Math.sqrt(this.absSquared); }
    /**
     * Alias for magnitude.
     *
     * @returns {number} |output|
     */
    get abs() { return Math.sqrt(this.absSquared); }
}

export class ComplexFunction extends ComplexField {
    /**
     * A complex field defined by a complex function f(z) → w.
     *
     * The function maps a complex input z to a complex output w.
     * The domain defines the x and y ranges for the real and imaginary parts of z.
     *
     * @param {Object} [options] - Configuration options
     * @param {Function} [options.func=_z => new Complex(0, 0)] - Complex function f(z) returning Complex
     * @param {Domain} [options.domain=new Domain()] - Domain defining x and y ranges for z
     *
     * @example
     * const f = new ComplexFunction({
     *     func: z => z ** 2,  // z squared
     *     domain: new Domain([-2, 2], [-2, 2])
     * });
     */
    constructor({
                    domain = new Domain(),
                    func = _z => new Complex(0, 0)
                } = {}) {
        super();
        this._domain = domain;
        this._complexFunction = func;
    }

    /**
     * Sample the complex function at normalized coordinates (u, v).
     *
     * @param {number} u - Normalized coordinate 1 in [0, 1]
     * @param {number} v - Normalized coordinate 2 in [0, 1]
     * @param {ComplexFunctionSample} complexFunctionSample - Object to store input/output complex values
     *
     * @example
     * const sample = new ComplexFunctionSample();
     * complexFunction.sample(0.5, 0.5, sample);
     * // sample.input = re + im*i at domain position
     * // sample.output = f(sample.input)
     */
    sample(u, v, complexFunctionSample) {
        const re = this._domain.xRange.scaleUnitParameter(u);
        const im = this._domain.yRange.scaleUnitParameter(v);
        complexFunctionSample.input.set(re, im);
        complexFunctionSample.output.copy(this._complexFunction(complexFunctionSample.input));
        complexFunctionSample.input.set(re, im); // in case the complex function accidentally modified the input
    }
}

/**
 * Discrete scalar field, i.e. a scalar field on a 2D grid.
 *
 * Stores values in a flat Float64Array indexed by y * nx + x.
 * Can be sampled, have its range computed, and evolved via numerical solvers.
 *
 * @param {Object} [options] - Configuration options
 * @param {number} [options.nx=100] - Number of grid points in x direction
 * @param {number} [options.ny=100] - Number of grid points in y direction
 * @param {number} [options.gridSpacing=1] - Spacing between grid points
 *
 * @example
 * const field = new DiscreteScalarField({nx: 64, ny: 64});
 * field.setValueAt(10, 20, 0.5);
 * const val = field.valueAt(10, 20); // 0.5
 * const range = field.rangeAt(); // Get min/max over entire field
 */
export class DiscreteScalarField extends ScalarField {
    /**
     * @param {Object} [options] - Configuration options
     * @param {number} [options.nx=100] - Number of grid points in x direction
     * @param {number} [options.ny=100] - Number of grid points in y direction
     * @param {number} [options.gridSpacing=1] - Spacing between grid points
     */
    constructor({
        nx = 100,
        ny = 100,
        gridSpacing = 1
    } = {}) {
        super();
        this._nx = nx;
        this._ny = ny;
        this._gridSpacing = gridSpacing;
        this._data = new Float64Array(nx * ny);
    }

    /**
     * Number of grid points in x direction.
     *
     * @returns {number} nx
     */
    get nx() { return this._nx; }
    /**
     * Number of grid points in y direction.
     *
     * @returns {number} ny
     */
    get ny() { return this._ny; }
    /**
     * Spacing between grid points.
     *
     * @returns {number} gridSpacing
     */
    get gridSpacing() { return this._gridSpacing; }
    /**
     * The underlying data array (Float64Array of length nx * ny).
     *
     * @returns {Float64Array} data
     *
     * @example
     * field.data[field.index(5, 5)] = 0.75;
     */
    get data() { return this._data; }

    /**
     * Compute the linear index for grid position (x, y).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @returns {number} Linear index = y * nx + x
     *
     * @example
     * field.index(5, 3) // Returns 3 * nx + 5
     */
    index(/** @type {number} */ x, /** @type {number} */ y) {
        return y * this._nx + x;
    }

    /**
     * Get the value at grid position (x, y).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @returns {number} Value at (x, y), or undefined if out of bounds
     *
     * @example
     * const val = field.valueAt(5, 5);
     */
    valueAt(/** @type {number} */ x, /** @type {number} */ y) {
        return this._data[this.index(x, y)];
    }

    /**
     * Set the value at grid position (x, y).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @param {number} value - Value to set
     *
     * @example
     * field.setValueAt(5, 5, 1.0); // Sets center cell to 1.0
     */
    setValueAt(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ value) {
        this._data[this.index(x, y)] = value;
    }

    /**
     * Reset all values to zero.
     *
     * @returns {this} This field instance for chaining
     *
     * @example
     * field.reset(); // All values are now 0
     */
    reset() {
        this._data.fill(0);
        return this;
    }

    /**
     * Get the range (min, max) of all values in the field.
     *
     * @returns {Interval} Interval [min, max] of all values
     *
     * @example
     * const I = field.rangeAt(); // I.from = min, I.to = max
     */
    rangeAt() {
        const interval = new Interval(Infinity, -Infinity);
        for (let i = 0; i < this.nx; i++)
            for (let j = 0; j < this.ny; j++)
                interval.include(this.valueAt(i, j));
        return interval;
    }

    /**
     * Evolve the field using a numerical solver for one time step.
     *
     * @param {Solver} solver - Solver instance with a step(method, dt) method
     * @param {number} [dt=0.01] - Time step size
     * @returns {this} This field instance for chaining
     *
     * @example
     * field.evolve(solver, 0.016); // Advance by 16ms
     */
    /**
     * @param {Solver} solver
     * @param {number} dt
     */
    evolve(solver, dt=0.01) {
        solver.step(this, dt);
        return this;
    }
}

/**
 * Discrete complex scalar field, i.e. a complex scalar field on a 2D grid.
 *
 * Stores real and imaginary parts separately in Float64Arrays.
 * Supports sampling, range computation, and evolution via numerical solvers.
 * Can be visualized using ComplexSurfaceView2D or ProbabilityDensityView2D.
 *
 * @param {Object} [options] - Configuration options
 * @param {number} [options.nx=128] - Number of grid points in x direction
 * @param {number} [options.ny=128] - Number of grid points in y direction
 * @param {Float64Array} [options.real=new Float64Array(nx * ny)] - Real part data
 * @param {Float64Array} [options.imag=new Float64Array(nx * ny)] - Imaginary part data
 *
 * @example
 * const field = new DiscreteComplexField({nx: 64, ny: 64});
 * field.setValueAt(10, 20, new Complex(1, 2));
 * const sample = new ComplexFunctionSample();
 * field.valueAt(10, 20, sample);
 * // sample.output = Complex(1, 2)
 */
export class DiscreteComplexField extends ComplexField {
    /**
     * @param {Object} [options] - Configuration options
     * @param {number} [options.nx=128] - Number of grid points in x direction
     * @param {number} [options.ny=128] - Number of grid points in y direction
     * @param {Float64Array} [options.real=new Float64Array(nx * ny)] - Real part data
     * @param {Float64Array} [options.imag=new Float64Array(nx * ny)] - Imaginary part data
     */
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

    /**
     * Number of grid points (width).
     *
     * @returns {number} nx
     *
     * @example
     * field.size // 128
     */
    get size() { return this.nx; }

    /**
     * Compute the linear index for grid position (x, y).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @returns {number} Linear index = y * nx + x
     *
     * @example
     * field.index(5, 3) // Returns 3 * nx + 5
     */
    index(x, y) {
        return y * this.nx + x;
    }

    /**
     * Reset all real and imaginary values to zero.
     *
     * @returns {this} This field instance for chaining
     *
     * @example
     * field.reset(); // All values are now 0 + 0i
     */
    reset() {
        this.real = new Float64Array(this.nx * this.ny);
        this.imag = new Float64Array(this.nx * this.ny);
        return this;
    }

    /**
     * Evolve the field using a numerical solver for one time step.
     *
     * @param {Solver} solver - Solver instance with a step(method, dt) method
     * @param {number} [dt=0.01] - Time step size
     * @returns {this} This field instance for chaining
     *
     * @example
     * field.evolve(solver, 0.016); // Advance by 16ms
     */
    /**
     * @param {Solver} solver
     * @param {number} dt
     */
    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }

    /**
     * Get the complex value at grid position (i, j).
     *
     * @param {number} i - X index (column)
     * @param {number} j - Y index (row)
     * @param {ComplexFunctionSample} complexFunctionSample - Object to store input/output
     *
     * @example
     * const sample = new ComplexFunctionSample();
     * field.valueAt(5, 5, sample);
     * // sample.output = complex value at (5,5)
     */
    /**
     * @param {number} i normalized coordinate one.
     * @param {number} j normalized coordinate two.
     * @param {ComplexFunctionSample} complexFunctionSample
     */
    valueAt(i, j, complexFunctionSample) {
        const index = this.index(i, j);
        complexFunctionSample.input.re = i;
        complexFunctionSample.input.im = j;
        complexFunctionSample.output.re = this.real[index];
        complexFunctionSample.output.im = this.imag[index];
    }

    /**
     * Sample the complex field at normalized coordinates (u, v) using bilinear interpolation.
     *
     * @param {number} u - Normalized coordinate 1 in [0, 1]
     * @param {number} v - Normalized coordinate 2 in [0, 1]
     * @param {ComplexFunctionSample} complexFunctionSample - Object to store input/output complex values
     *
     * @example
     * const sample = new ComplexFunctionSample();
     * field.sample(0.5, 0.5, sample);
     * // sample.output = interpolated complex value at (u, v)
     */
    /**
     * @param {number} u normalized coordinate one.
     * @param {number} v normalized coordinate two.
     * @param {ComplexFunctionSample} complexFunctionSample
     */
    sample(u, v, complexFunctionSample) {
        // bilinear interpolation
        const x = u * (this.nx - 1);
        const y = v * (this.ny - 1);

        const x0 = Math.floor(x);
        const y0 = Math.floor(y);

        const x1 = Math.min(x0 + 1, this.nx - 1);
        const y1 = Math.min(y0 + 1, this.ny - 1);

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

        complexFunctionSample.input.re = x;
        complexFunctionSample.input.im = y;

        complexFunctionSample.output.re = r0 * (1 - ty) + r1 * ty;
        complexFunctionSample.output.im = i0 * (1 - ty) + i1 * ty;
    }
}


/**
 * Discrete scalar field on a three-dimensional Cartesian grid.
 *
 * Stores values in a flat Float64Array indexed by z * nx * ny + y * nx + x.
 * Can be used for 3D scalar fields like temperature, pressure, or density.
 *
 * @param {Object} [options] - Configuration options
 * @param {number} [options.nx=32] - Number of grid points in x direction
 * @param {number} [options.ny=32] - Number of grid points in y direction
 * @param {number} [options.nz=32] - Number of grid points in z direction
 *
 * @example
 * const field = new DiscreteScalarField3D({nx: 16, ny: 16, nz: 16});
 * field.setValueAt(1, 2, 3, 0.5);
 * const val = field.valueAt(1, 2, 3); // 0.5
 */
export class DiscreteScalarField3D extends ScalarField {
    /**
     * @param {Object} [options] - Configuration options
     * @param {number} [options.nx=32] - Number of grid points in x direction
     * @param {number} [options.ny=32] - Number of grid points in y direction
     * @param {number} [options.nz=32] - Number of grid points in z direction
     */
    constructor({ nx = 32, ny = 32, nz = 32 } = {}) {
        super();
        this._nx = nx;
        this._ny = ny;
        this._nz = nz;
        this._data = new Float64Array(nx * ny * nz);
    }

    /**
     * Number of grid points in x direction.
     *
     * @returns {number} nx
     */
    get nx() { return this._nx; }
    /**
     * Number of grid points in y direction.
     *
     * @returns {number} ny
     */
    get ny() { return this._ny; }
    /**
     * Number of grid points in z direction.
     *
     * @returns {number} nz
     */
    get nz() { return this._nz; }
    /**
     * The underlying data array (Float64Array of length nx * ny * nz).
     *
     * @returns {Float64Array} data
     *
     * @example
     * field.data[field.index(1, 2, 3)] = 0.75;
     */
    get data() { return this._data; }

    /**
     * Compute the linear index for 3D grid position (x, y, z).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @param {number} z - Z index (depth)
     * @returns {number} Linear index = z * nx * ny + y * nx + x
     *
     * @example
     * field.index(1, 2, 3) // Returns 3 * nx * ny + 2 * nx + 1
     */
    index(x, y, z) {
        return z * this._nx * this._ny + y * this._nx + x;
    }

    /**
     * Get the value at 3D grid position (x, y, z).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @param {number} z - Z index (depth)
     * @returns {number} Value at (x, y, z)
     *
     * @example
     * const val = field.valueAt(1, 2, 3);
     */
    valueAt(x, y, z) {
        return this._data[this.index(x, y, z)];
    }

    /**
     * Set the value at 3D grid position (x, y, z).
     *
     * @param {number} x - X index (column)
     * @param {number} y - Y index (row)
     * @param {number} z - Z index (depth)
     * @param {number} value - Value to set
     *
     * @example
     * field.setValueAt(1, 2, 3, 1.0); // Sets central voxel to 1.0
     */
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} value
     */
    setValueAt(x, y, z, value) {
        this._data[this.index(x, y, z)] = value;
    }

    /**
     * Reset all values to zero.
     *
     * @returns {this} This field instance for chaining
     *
     * @example
     * field.reset(); // All values are now 0
     */
    reset() {
        this._data.fill(0);
        return this;
    }
}

/**
 * Discrete complex field on a three-dimensional Cartesian grid.
 */
export class DiscreteComplexField3D extends ComplexField {
    /**
     * @param {Object} [options] - Configuration options
     * @param {number} [options.nx=32] - Number of grid points in x direction
     * @param {number} [options.ny=32] - Number of grid points in y direction
     * @param {number} [options.nz=32] - Number of grid points in z direction
     * @param {Float64Array} [options.real] - Array containing real parts of scalar field
     * @param {Float64Array} [options.imag] - Array containing imaginary parts of scalar field
     */
    constructor({
        nx = 32,
        ny = 32,
        nz = 32,
        real = new Float64Array(nx * ny * nz),
        imag = new Float64Array(nx * ny * nz)
    } = {}) {
        super();
        this.nx = nx;
        this.ny = ny;
        this.nz = nz;
        this.real = real;
        this.imag = imag;
    }

    get size() { return this.real.length; }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    index(x, y, z) {
        return z * this.nx * this.ny + y * this.nx + x;
    }

    reset() {
        this.real.fill(0);
        this.imag.fill(0);
        return this;
    }

    /**
     * @param {Solver} solver
     * @param {number} dt
     */
    evolve(solver, dt) {
        solver.step(this, dt);
        return this;
    }
}
