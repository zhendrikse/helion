export function degToRad(angle) {
    return angle * Math.PI / 180;
}

export function toCartesian(radius, theta, phi) {
    return new Vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );
}

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

export class Vec2 {
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    set(x,y,z) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    addScaledVector(v, scalar) {
        this.x += v.x * scalar;
        this.y += v.y * scalar;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        return this;
    }

    divideScalar(s) {
        this.x /= s;
        this.y /= s;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    projectOnVector(v) {
        const denominator = v.lengthSq();

        if (denominator === 0) {
            return this.set(0, 0, 0);
        }

        const scalar = this.dot(v) / denominator;

        this.x = v.x * scalar;
        this.y = v.y * scalar;

        return this;
    }

    normalize() {
        const inv = 1 / this.length();

        this.x *= inv;
        this.y *= inv;

        return this;
    }

    random() {
        this.x = Math.random();
        this.y = Math.random();
        return this;
    }

    distanceSquaredTo(position) {
        return (position.x - this.x) * (position.x - this.x) +
            (position.y - this.y) * (position.y - this.y);
    }

    distanceTo(position) {
        return Math.sqrt(this.distanceSquaredTo(position));
    }
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

    /**
     * Rotates the body around a world-space axis.
     *
     * @param {"x"|"y"|"z"} axis
     * @param {number} angle Angle in radians.
     * @returns {this}
     */
    rotate(axis, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const { x, y, z } = this;

        switch (axis) {
            case "x":
                this.y = cos * y - sin * z;
                this.z = sin * y + cos * z;
                break;

            case "y":
                this.x = cos * x + sin * z;
                this.z = -sin * x + cos * z;
                break;

            case "z":
                this.x = cos * x - sin * y;
                this.y = sin * x + cos * y;
                break;

            default:
                throw new Error(`Unknown rotation axis: ${axis}`);
        }

        return this;
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
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
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

export class Complex {
    static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));

    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    get phase() { return Math.atan2(this.im, this.re) / (2* Math.PI); }
    get absSquared() { return this.re * this.re + this.im * this.im; }
    get magnitude() { return Math.sqrt(this.absSquared); }
    get abs() { return Math.sqrt(this.absSquared); }

    clone() {
        return new Complex(this.re, this.im);
    }

    set(real, imag) {
        this.re = real;
        this.im = imag;
        return this;
    }

    copy(complex) {
        this.re = complex.re;
        this.im = complex.im;
        return this;
    }

    multiply(complex) {
        const real = this.re * complex.re - this.im * complex.im;
        const imag = this.re * complex.im + this.im * complex.re
        this.re = real;
        this.im = imag;
        return this;
    }

    add(complex) {
        this.re += complex.re;
        this.im += complex.im;
        return this;
    }

    subtract(complex) {
        this.re -= complex.re;
        this.im -= complex.im;
        return this;
    }

    exp() {
        const real = Math.exp(this.re) * Math.cos(this.im);
        const imag = Math.exp(this.re) * Math.sin(this.im);
        this.re = real;
        this.im = imag;
        return this;
    }

    log() {
        const real = Math.log(this.abs);
        const imag = Math.atan2(this.im, this.re);
        this.re = real;
        this.im = imag;
        return this;
    }

    sin() {
        const a = new Complex(-this.im, this.re).exp();
        const b = new Complex(this.im, -this.re).exp();
        this.re = (a.im - b.im) / 2;
        this.im = (b.re - a.re) / 2;
        return this;
    }

    divide = (z2) => {
        const denominator = z2.re * z2.re + z2.im * z2.im;
        const re = this.re * z2.re + this.im * z2.im;
        const im = this.im * z2.re - this.re * z2.im;
        this.re = re / denominator;
        this.im = im / denominator;
        return this;
    }

    sqrt() {
        const r = this.abs;
        const real = Math.sqrt((r + this.re) / 2);
        const imag = Math.sign(this.im || 1) * Math.sqrt((r - this.re) / 2);
        this.re = real;
        this.im = imag;
        return this;
    }

    multiplyScalar(scalar) {
        this.re *= scalar;
        this.im *= scalar;
        return this;
    }
}



