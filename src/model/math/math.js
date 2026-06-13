import {MathPhysicsModelBehavior} from "../../core/helion.js";

export function generateUUID() {
    let // Public Domain/MIT
        d = new Date().getTime(),
        d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

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
export function uniform(min, max) {
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

    distanceSquaredTo(position) {
        return (position.x - this.x) * (position.x - this.x) +
            (position.y - this.y) * (position.y - this.y) +
            (position.z - this.z) * (position.z - this.z);
    }

    distanceTo(position) {
        return Math.sqrt(this.distanceSquaredTo(position));
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

    get count() {
        return Math.floor((this.to - this.from) / this.stepSize) + 1;
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

    normalize = (value) => this.to === this.from ? 0 : (value - this.from) / this.range;

    get range() {
        return (this.from === Infinity || this.to === Infinity) ? Infinity : this.to - this.from;
    }

    /**
     * Scale a unit parameter [0, 1] up to this interval
     * @param unitParameter the parameter that runs from [0, 1]
     * @returns {number} the scaled parameter
     */
    scaleUnitParameter = (unitParameter) => this.range * (unitParameter + this.from / this.range);
}










export class VectorFieldValue extends MathPhysicsModelBehavior {
    constructor({
        position = new Vec3(),
        axis = new Vec3()
    } = {})  {
        super();
        this.position = position.clone();
        this.axis = axis.clone();
    }

    clone() {
        return new VectorFieldValue({
            position: this.position.clone(),
            axis: this.axis.clone(),
        });
    }
}

export class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    clone() { return new Complex(this.re, this.im); }

    get phase() { return Math.atan2(this.im, this.re); }
    get absSquared() { return this.re * this.re + this.im * this.im; }
    get magnitude() { return Math.sqrt(this.absSquared); }
    get abs() { return Math.sqrt(this.absSquared); }

    // static multiplyScalar = (a, scalar) => new Complex(a.re * scalar, a.im * scalar);
    // static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));
    // static absSquared(z_) { return z_.re * z_.re + z_.im * z_.im; }
    // static abs = (z) => Math.sqrt(Complex.absSquared(z));
    // static add = (a, b) => new Complex(a.re + b.re, a.im + b.im);
    // static subtract = (a, b) => new Complex(a.re - b.re, a.im - b.im);
    // static multiply = (a, b) => new Complex(
    //     a.re * b.re - a.im * b.im,
    //     a.re * b.im + a.im * b.re
    // );
    // static log = (z) => new Complex(Math.log(Complex.abs(z)), Math.atan2(z.im, z.re));
    // static exp = (z) => new Complex(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im))
    // static sin(z) {
    //     const a = Complex.exp(new Complex(-z.im, z.re));
    //     const b = Complex.exp(new Complex(z.im, -z.re));
    //     return new Complex((a.im - b.im) / 2, (b.re - a.re) / 2);
    // }
    // static divide = (z1, z2) => {
    //     const denominator = z2.re * z2.re + z2.im * z2.im;
    //     const re = z1.re * z2.re + z1.im * z2.im;
    //     const im = z1.im * z2.re - z1.re * z2.im;
    //     return new Complex(re / denominator, im / denominator);
    // }
    // static sqrt(z) {
    //     const r = Complex.abs(z);
    //     const real = Math.sqrt((r + z.re) / 2);
    //     const imag = Math.sign(z.im || 1) * Math.sqrt((r - z.re) / 2);
    //     return new Complex(real, imag);
    // }
}

export class AdaptiveSymmetricNormalizer {
    constructor({ smoothing = 0.05 } = {}) {
        this._smoothing = smoothing;
        this.reset();
    }

    observe(v) {
        if (!Number.isFinite(v)) return;

        const a = Math.abs(v);
        this._maxAbs = Math.max(this._maxAbs * (1 - this._smoothing) + a * this._smoothing, a);
    }

    normalize(v) {
        if (!Number.isFinite(v)) return 0.5;

        const r = Math.max(this._maxAbs, 1e-9);
        const clamped = Math.max(-r, Math.min(r, v));

        return 0.5 + 0.5 * (clamped / r);
    }

    reset() {
        this._maxAbs = 1;
    }
}

// TODO This is a vector representation of a complex scalar value,
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
        return new VectorFieldValue({
            position: this.position.clone(),
            value: this.value.clone(),
        });
    }

    get axis() { return new Vec3(0, this.value.re, this.value.im); }
}

