/*************************
 * M A T H E M A T I C S *
 *************************/

/**
 * Pick a number from a normal distribution using Box-Muller transform.
 *
 * @param mu Average.
 * @param sigma Standard deviation
 * @returns A normally distributed number.
 */
export function normalDistribution(mu, sigma) {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma + mu;
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
export function randomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function factorial(n) {
    let result = 1;
    for (let i=2; i<=n; i++)
        result *= i;
    return result;
}

export function linspace(start, stop, num) {
    const linSpace = [];
    const step = (stop - start) / (num - 1);
    for (let i = 0; i < num; i++)
        linSpace.push(start + i * step);
    return linSpace;
}

export function meshgrid(x, y) {
    const X = [];
    const Y = [];

    for (let i = 0; i < y.length; i++) {
        X.push(x.slice());
        Y.push(Array(x.length).fill(y[i]));
    }

    return [X, Y];
}

export class Vec3 {
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;

        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    }

    set(x,y,z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    addScaledVector(v, scalar) {
        this.x += v.x * scalar;
        this.y += v.y * scalar;
        this.z += v.z * scalar;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    divideScalar(s) {
        this.x /= s;
        this.y /= s;
        this.z /= s;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    projectOnVector(v) {
        const denominator = v.lengthSq();

        if (denominator === 0) {
            return this.set(0, 0, 0);
        }

        const scalar = this.dot(v) / denominator;

        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;

        return this;
    }

    normalize() {
        const inv = 1 / this.length();

        this.x *= inv;
        this.y *= inv;
        this.z *= inv;

        return this;
    }

    random() {
        this.x = Math.random();
        this.y = Math.random();
        this.z = Math.random();
        return this;
    }
}

export class Range {
    constructor(from, to, stepSize) {
        this.from = from;
        this.to = to;
        this.stepSize = stepSize || 0.1;
    }

    /**
     * Use:
     *   for (const x of range)
     *     console.log(x);
     *
     * @returns {Generator<*, void, *>}
     */
    *[Symbol.iterator]() {
        if (!isFinite(this.from) || !isFinite(this.to))
            throw new Error("Cannot iterate over an infinite interval.");
        if (this.stepSize <= 0)
            throw new Error("stepSize must be > 0");

        const n = Math.floor((this.to - this.from) / this.stepSize);
        for (let i = 0; i <= n; i++)
            yield this.from + i * this.stepSize;
    }
}

export class Interval {
    constructor(from = -Infinity, to = Infinity) {
        this.from = from;
        this.to = to;
    }

    shrinkTo(value) {
        if (this.from < value) this.from = value;
        if (this.to > value) this.to = value;
    }

    scaleValue = (value) => this.to === this.from ? 0 : (value - this.from) / this.range();
    range = () => (this.from === Infinity || this.to === Infinity) ? Infinity : this.to - this.from;
    /**
     * Scale a unit parameter [0, 1] up to this interval
     * @param unitParameter the parameter that runs from [0, 1]
     * @returns {number} the scaled parameter
     */
    scaleUnitParameter = (unitParameter) => this.range() * (unitParameter + this.from / this.range());
}

export class VectorFieldVector {
    constructor({
                    position = new Vec3(),
                    axis = new Vec3()
                } = {})  {
        this.position = position.clone();
        this.axis = axis.clone();
    }

    clone() {
        return new VectorFieldVector({
            position: this.position.clone(),
            axis: this.axis.clone(),
        });
    }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };
}

export class ScalarField {
    scalarValueAt(x, y) {
        throw new Error("You invoked the method of an abstract base class. Please create a subclass first.");
    }

    updateWith(time) {}
}

class ScalarGridField extends ScalarField {
    constructor(nx, ny, width, height) {
        super();

        this._nx = nx;
        this._ny = ny;

        this._data = new Float32Array(nx * ny);
    }

    scalarValueAt(x, y) {
        // bilinear interpolation
    }

    valueAt(i, j) {
        return this._data[i + this._nx * j];
    }

    setValueAt(i, j, value) {
        this._data[i + this._nx * j] = value;
    }
}


// TODO This is a vector representation of a comlex scalar value,
// rotating in the complex plane, coloured by its phase, and size
// equal to the abs value.
export class ComplexScalarFieldValue {
    constructor({
                    position = new Vec3(),
                    value = new Complex(0, 0)
                } = {})  {
        this.position = position.clone();
        this.value = value;
    }

    clone() {
        return new VectorFieldVector({
            position: this.position.clone(),
            value: this.value.clone(),
        });
    }

    get axis() { return new Vec3(0, this.value.re, this.value.im); }
}

export class VectorField {
    constructor() { }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    vectorAt(positionVector) {
        throw new Error("You invoked the method of an abstract base class. Please create a subclass first.");
    }

    #centralDifferences(position, h) {
        const dx = new Vec3(h, 0, 0);
        const dy = new Vec3(0, h, 0);
        const dz = new Vec3(0, 0, h);

        const Fx1 = this.vectorAt(position.clone().add(dx));
        const Fx0 = this.vectorAt(position.clone().sub(dx));

        const Fy1 = this.vectorAt(position.clone().add(dy));
        const Fy0 = this.vectorAt(position.clone().sub(dy));

        const Fz1 = this.vectorAt(position.clone().add(dz));
        const Fz0 = this.vectorAt(position.clone().sub(dz));
        return { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 };
    }

    divergence(position, h = 1e-2) {
        const { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 } = this.#centralDifferences(position, h);

        return (
            (Fx1.x - Fx0.x) +
            (Fy1.y - Fy0.y) +
            (Fz1.z - Fz0.z)
        ) / (2 * h);
    }

    curl(position, h = 1e-2) {
        const { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 } = this.#centralDifferences(position, h);

        return new Vec3(
            (Fy1.z - Fy0.z - (Fz1.y - Fz0.y)) / (2 * h),
            (Fz1.x - Fz0.x - (Fx1.z - Fx0.z)) / (2 * h),
            (Fx1.y - Fx0.y - (Fy1.x - Fy0.x)) / (2 * h)
        );
    }

    curlMagnitude(position, h = 1e-2) {
        return this.curl(position, h).length();
    }
}

export class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    clone() { return new Complex(this.re, this.im); }

    absSquared() { return Complex.absSquared(this); }
    abs() { return Complex.abs(this); }
    phase = () => Math.atan2(this.im, this.re);

    static multiplyScalar = (a, scalar) => new Complex(a.re * scalar, a.im * scalar);
    static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));
    static absSquared(z_) { return z_.re * z_.re + z_.im * z_.im; }
    static abs = (z) => Math.sqrt(Complex.absSquared(z));
    static add = (a, b) => new Complex(a.re + b.re, a.im + b.im);
    static subtract = (a, b) => new Complex(a.re - b.re, a.im - b.im);
    static multiply = (a, b) => new Complex(
        a.re * b.re - a.im * b.im,
        a.re * b.im + a.im * b.re
    );
    static log = (z) => new Complex(Math.log(Complex.abs(z)), Math.atan2(z.im, z.re));
    static exp = (z) => new Complex(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im))
    static sin(z) {
        const a = Complex.exp(new Complex(-z.im, z.re));
        const b = Complex.exp(new Complex(z.im, -z.re));
        return new Complex((a.im - b.im) / 2, (b.re - a.re) / 2);
    }
    static divide = (z1, z2) => {
        const denominator = z2.re * z2.re + z2.im * z2.im;
        const re = z1.re * z2.re + z1.im * z2.im;
        const im = z1.im * z2.re - z1.re * z2.im;
        return new Complex(re / denominator, im / denominator);
    }
    static sqrt(z) {
        const r = Complex.abs(z);
        const real = Math.sqrt((r + z.re) / 2);
        const imag = Math.sign(z.im || 1) * Math.sqrt((r - z.re) / 2);
        return new Complex(real, imag);
    }
}

export class Surface {
    sample(u, v, target) {
        throw new Error("Abstract class: sample() must be implemented!");
    }

    alwaysWith(view) { return { body: this, view: view, always: true }; };
    onceWith(view) { return { body: this, view: view, always: false}; };
}

/**
 * Field for a surface based on a lattice
 */
export class SurfaceField {
    valueAt(i, j) {
        throw new Error("valueAt(i,j) not implemented");
    }
}

export class PDESurfaceField extends SurfaceField {
    constructor({
        resolution = 50
    } = {}) {
        super();
        this._resolution = resolution;
        this._u = this._createGrid(resolution);
        this._uPrev = this._createGrid(resolution);
        this._uNext = this._createGrid(resolution);
        this._time = 0;
    }

    _createGrid(n) {
        return Array.from({ length: n }, () => new Float32Array(n));
    }

    update(dt) {
        this._time += dt;
        this.step(dt);
        this._swap();
    }

    _swap() {
        const tmp = this._uPrev;
        this._uPrev = this._u;
        this._u = this._uNext;
        this._uNext = tmp;
    }

    // override in subclass
    step(dt) {
        throw new Error("step(dt) must be implemented in each concrete PDE surface");
    }

    valueAt(i, j) { return this._u[i][j]; }

    size() { return this._resolution; }
}

export class FiniteDifferenceMethodField extends PDESurfaceField{
    constructor({
        resolution = 100,
        damping = 0.999,
        waveSpeed = 2
    } = {}) {
        super({resolution});
        this._c = waveSpeed
        this._damping = damping;
        this._init();
    }

    _init() {
        for (let i = 0; i < this._resolution; i++)
            for (let j = 0; j < this._resolution; j++) {
                const x = i / this._resolution;
                const y = j / this._resolution;

                this._u[i][j] = Math.sin(10 * x) * Math.cos(10 * y);
                this._uPrev[i][j] = this._u[i][j];
            }
    }

    step(dt) {
        const resolution = this._resolution;
        const c2 = this._c * this._c;
        const dt_dt_c2 = dt * dt * c2;
        for (let i = 1; i < resolution - 1; i++)
            for (let j = 1; j < resolution - 1; j++) {
                const laplacian =
                    this._u[i+1][j] + this._u[i-1][j] + this._u[i][j+1] + this._u[i][j-1] - 4 * this._u[i][j];
                this._uNext[i][j] = 2 * this._u[i][j] - this._uPrev[i][j] + dt_dt_c2 * laplacian;
                this._uNext[i][j] *= this._damping;
            }

        this._applyBoundary();
    }

    _applyBoundary() {
        const n = this._resolution - 1;
        for (let i = 0; i < this._resolution; i++) {
            this._uNext[0][i] = 0;
            this._uNext[n][i] = 0;
            this._uNext[i][0] = 0;
            this._uNext[i][n] = 0;
        }
    }

}

/**
 * Partial different equation surface, a dynamic surface governed by a partial differential equation.
 */
export class PDESurface extends Surface {
    constructor({
        field,
        width = 10,
        depth = 10
    } = {}) {
        super();
        this._field = field;
        this._width = width;
        this._depth = depth;
    }

    update(dt) {
        this._field.update(dt);
    }

    sample(u, v, target) {
        const i = Math.floor(u * (this._field.size() - 1));
        const j = Math.floor(v * (this._field.size() - 1));
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;

        target.set(x, this._field.valueAt(i, j), z);
    }
}
