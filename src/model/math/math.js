import { Vec3 } from './objects.js'

/**
 * Bessel function J_m(x) via series expansion.
 *
 * @param {number} m - Order of the Bessel function (integer)
 * @param {number} x - Argument
 * @returns {number} Bessel function value J_m(x)
 *
 * @example
 * besselJ(0, 1) // ~0.765
 */
export function besselJ(m, x) {
    if (x === 0) return m === 0 ? 1 : 0;
    // voor x <0 : J_m(-x)=(-1)^m J_m(x)
    if (x < 0) return (m % 2 === 0 ? 1 : -1) * besselJ(m, -x);
    let term = Math.pow(x / 2, m);
    let factM = 1;
    for (let i = 2; i <= m; i++) factM *= i;
    term /= factM;
    let sum = term;
    for (let k = 1; k < 40; k++) {
        term *= - (x * x / 4) / (k * (k + m));
        sum += term;
        if (Math.abs(term) < 1e-12) break;
    }
    return sum;
}

/**
 * Zero points alpha_{m,n} of J_m (m=0..4, n=1..4) — first 4 per m
 * @type {Record<number, number[]>}
 */
export const BESSEL_ZEROS = {
    0: [2.404825558, 5.520078110, 8.653727913, 11.79153444],
    1: [3.831705970, 7.015586670, 10.17346814, 13.32369194],
    2: [5.135622302, 8.417244140, 11.61984117, 14.79595178],
    3: [6.380161895, 9.761023130, 13.01520072, 16.22346616],
    4: [7.588342434, 11.06470933, 14.37253667, 17.61624782],
};

/**
 * Convert degrees to radians.
 *
 * @param {number} angle - Angle in degrees
 * @returns {number} Angle in radians
 */
export function degToRad(angle) {
    return angle * Math.PI / 180;
}

/**
 * Convert radians to degrees.
 *
 * @param {number} angle - Angle in radians
 * @returns {number} Angle in degrees
 */
export function radToDeg(angle) {
    return angle * 180 / Math.PI;
}

/**
 * Convert spherical coordinates to Cartesian coordinates.
 *
 * @param {number} radius - Radial distance
 * @param {number} theta - Polar angle (0 <= theta <= π) in radians
 * @param {number} phi - Azimuthal angle (0 <= phi < 2π) in radians
 * @returns {Vec3} Cartesian coordinates [x, y, z]
 *
 * @example
 * toCartesian(1, Math.PI/2, 0) // Vec3 { x: 1, y: 0, z: 0 }
 */
export function toCartesian(radius, theta, phi) {
    return new Vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );
}

/**
 * Generate a UUID v4 string.
 *
 * @returns {string} UUID in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * generateUUID() // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
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
 * Compute the probability density function of a normal (Gaussian) distribution.
 *
 * @param {number} x - Point at which to evaluate
 * @param {number} mean - Mean (μ) of the distribution
 * @param {number} sigma - Standard deviation (σ) of the distribution, must be > 0
 * @returns {number} Probability density at x
 *
 * @example
 * normalDistribution(0, 0, 1) // 0.3989...
 */
export function normalDistribution(x, mean, sigma) {
    return Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma)) /
        Math.sqrt(2 * Math.PI * sigma * sigma);
}

/**
 * Generate a normally distributed random number using the Box-Muller transform.
 *
 * @param {number} mu - Mean (default 0)
 * @param {number} sigma - Standard deviation (default 1), must be > 0
 * @returns {number} A normally distributed random number
 *
 * @example
 * sampleNormalDistribution(0, 1) // Returns N(0,1) distributed value
 */
export function sampleNormalDistribution(mu, sigma) {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma + mu;
}

/**
 * Returns a random number between min (inclusive) and max (exclusive).
 *
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random value in [min, max)
 *
 * @example
 * uniform(0, 1) // Returns value in [0, 1)
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
 *
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in [min, max]
 *
 * @example
 * randomInt(1, 5) // Returns 1, 2, 3, 4, or 5
 */
export function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Compute the factorial of a non-negative integer n (n!).
 *
 * @param {number} n - Non-negative integer
 * @returns {number} n factorial (n!)
 *
 * @example
 * factorial(5) // 120
 * factorial(0) // 1
 */
export function factorial(n) {
    let result = 1;
    for (let i=2; i<=n; i++)
        result *= i;
    return result;
}

export class Range {
    /**
     * Represents a numeric interval [from, to] with an optional step size.
     *
     * @param {number} from - Start of interval (inclusive)
     * @param {number} to - End of interval (inclusive)
     * @param {number} [stepSize=0.1] - Step size between values
     *
     * @example
     * const r = new Range(0, 10, 2); // Creates [0, 2, 4, 6, 8, 10]
     */
    constructor(from, to, stepSize) {
        this.from = from;
        this.to = to;
        this.stepSize = stepSize || 0.1;
    }

    /**
     * Iterate over all values in the range.
     *
     * @returns {Generator<number, void, number>} Generator yielding values from from to to inclusive
     *
     * @throws {Error} If from or to are not finite, or stepSize <= 0
     *
     * @example
     * [...new Range(0, 5)] // [0, 1, 2, 3, 4, 5]
     */
    *[Symbol.iterator]() {
        if (!isFinite(this.from) || !isFinite(this.to))
            throw new Error('Cannot iterate over an infinite interval.');
        if (this.stepSize <= 0)
            throw new Error('stepSize must be > 0');

        const n = Math.floor((this.to - this.from) / this.stepSize);
        for (let i = 0; i <= n; i++)
            yield this.from + i * this.stepSize;
    }

    /**
     * Number of values in the range (inclusive).
     *
     * @returns {number} Count of values
     *
     * @example
     * new Range(0, 5).count // 6
     */
    get count() {
        return Math.floor((this.to - this.from) / this.stepSize) + 1;
    }
}

export class Interval {
    /**
     * Represents a closed interval [from, to].
     *
     * @param {number} from - Left bound (must be < to)
     * @param {number} to - Right bound (must be > from)
     *
     * @throws {Error} If from is null, to is null, or from === to
     *
     * @example
     * const I = new Interval(0, 1); // Creates interval [0, 1]
     */
    constructor(from, to) {
        if (from == null || to == null || from === to)
            throw new Error(`Invalid construction of interval [${from}, ${to}]`);
        this.from = from;
        this.to = to;
    }

    /**
     * Resize the interval to include the given value.
     *
     * @param {number} value - Value to include in the interval
     *
     * @example
     * const I = new Interval(0, 10);
     * I.include(5);  // I is now [0, 10] (no change since 5 is already included)
     * I.include(15); // I is now [0, 15]
     */
    include(value) {
        if (value < this.from) this.from = value;
        if (value > this.to)   this.to = value;
    }

    /**
     * Normalize a value with respect to this interval, treating the range as 1.
     *
     * @param {number} value - Value to normalize
     * @returns {number} Normalized value in [0, 1], or 0 if from === to
     *
     * @example
     * new Interval(0, 10).normalize(5) // 0.5
     */
    normalize = value => this.to === this.from ? 0 : (value - this.from) / this.range;

    /**
     * The width of the interval (to - from).
     *
     * @returns {number} Interval range
     *
     * @example
     * new Interval(0, 10).range // 10
     */
    get range() { return this.to - this.from; }
    /**
     * The minimum value of the interval.
     *
     * @returns {number} Minimum value (from)
     */
    get min() { return this.from; }
    /**
     * The maximum value of the interval.
     *
     * @returns {number} Maximum value (to)
     */
    get max() { return this.to; }

    /**
     * Check if two intervals are equal.
     *
     * @param {Interval} other - Interval to compare
     * @returns {boolean} true if both from and to are equal
     *
     * @example
     * new Interval(0, 5).equals(new Interval(0, 5)) // true
     */
    equals(other) {
        return this.from === other.from && this.to === other.to;
    }

    /**
     * Scale a unit parameter [0, 1] up to this interval.
     *
     * @param {number} unitParameter - Parameter in range [0, 1]
     * @returns {number} Scaled value in [from, to]
     *
     * @example
     * new Interval(0, 100).scaleUnitParameter(0.5) // 50
     */
    scaleUnitParameter = unitParameter => this.range * unitParameter + this.from;
}

export class Complex {
    /**
     * Complex number class representing z = re + im*i.
     *
     * @param {number} [re=0] - Real part
     * @param {number} [im=0] - Imaginary part
     *
     * @example
     * const z = new Complex(3, 4); // z = 3 + 4i
     */
    static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));

    /**
     * @param {number} [re=0] - Real part
     * @param {number} [im=0] - Imaginary part
     */
    constructor(re = 0, im = 0) {
        this.re = re;
        this.im = im;
    }

    /**
     * Phase (angle) of the complex number, in cycles [−0.5, 0.5].
     *
     * @returns {number} Phase in cycles (2π radians = 1 cycle)
     *
     * @example
     * new Complex(1, 0).phase // 0
     * new Complex(0, 1).phase // 0.25
     */
    get phase() { return Math.atan2(this.im, this.re) / (2* Math.PI); }
    /**
     * Squared absolute value |z|².
     *
     * @returns {number} |z|²
     *
     * @example
     * new Complex(3, 4).absSquared // 25
     */
    get absSquared() { return this.re * this.re + this.im * this.im; }
    /**
     * Absolute value (magnitude) |z|.
     *
     * @returns {number} |z|
     *
     * @example
     * new Complex(3, 4).magnitude // 5
     */
    get magnitude() { return Math.sqrt(this.absSquared); }
    /**
     * Alias for magnitude.
     *
     * @returns {number} |z|
     */
    get abs() { return Math.sqrt(this.absSquared); }

    /**
     * Create a copy of this complex number.
     *
     * @returns {Complex} New complex with same real and imaginary parts
     *
     * @example
     * const z = new Complex(1, 2);
     * const w = z.clone(); // w = 1 + 2i
     */
    clone() {
        return new Complex(this.re, this.im);
    }

    /**
     * Set the real and imaginary parts of this complex number.
     *
     * @param {number} real - Real part
     * @param {number} imag - Imaginary part
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const z = new Complex(1, 2);
     * z.set(3, 4); // z is now 3 + 4i, returns z
     */
    set(real, imag) {
        this.re = real;
        this.im = imag;
        return this;
    }

    /**
     * Copy the values from another complex number.
     *
     * @param {Complex} complex - Source complex number
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const a = new Complex(1, 2);
     * const b = new Complex();
     * b.copy(a); // b is now 1 + 2i, returns b
     */
    copy(complex) {
        this.re = complex.re;
        this.im = complex.im;
        return this;
    }

    /**
     * Multiply by another complex number (this * complex).
     *
     * @param {Complex} complex - Multiplier
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const a = new Complex(1, 2);
     * const b = new Complex(3, 4);
     * a.multiply(b); // a is now -5 + 10i (since (1+2i)(3+4i) = 3+4i+6i-8 = -5+10i)
     */
    multiply(complex) {
        const real = this.re * complex.re - this.im * complex.im;
        const imag = this.re * complex.im + this.im * complex.re;
        this.re = real;
        this.im = imag;
        return this;
    }

    /**
     * Add another complex number (this + complex).
     *
     * @param {Complex} complex - Addend
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const a = new Complex(1, 2);
     * const b = new Complex(3, 4);
     * a.add(b); // a is now 4 + 6i
     */
    add(complex) {
        this.re += complex.re;
        this.im += complex.im;
        return this;
    }

    /**
     * Subtract another complex number (this - complex).
     *
     * @param {Complex} complex - Subtrahend
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const a = new Complex(5, 6);
     * const b = new Complex(3, 4);
     * a.subtract(b); // a is now 2 + 2i
     */
    subtract(complex) {
        this.re -= complex.re;
        this.im -= complex.im;
        return this;
    }

    /**
     * Complex exponential e^z.
     *
     * @returns {Complex} e^z
     *
     * @example
     * new Complex(0, Math.PI).exp() // Complex(-1, 0) ≈ -1
     */
    exp() {
        const real = Math.exp(this.re) * Math.cos(this.im);
        const imag = Math.exp(this.re) * Math.sin(this.im);
        this.re = real;
        this.im = imag;
        return this;
    }

    /**
     * Complex natural logarithm ln(z).
     *
     * @returns {Complex} ln(z)
     *
     * @example
     * new Complex(1, 0).log() // Complex(0, 0) since ln(1) = 0
     */
    log() {
        const real = Math.log(this.abs);
        const imag = Math.atan2(this.im, this.re);
        this.re = real;
        this.im = imag;
        return this;
    }

    /**
     * Complex sine sin(z).
     *
     * @returns {Complex} sin(z)
     *
     * @example
     * new Complex(0, Math.PI/2).sin() // Complex(1, 0) = 1
     */
    sin() {
        const a = new Complex(-this.im, this.re).exp();
        const b = new Complex(this.im, -this.re).exp();
        this.re = (a.im - b.im) / 2;
        this.im = (b.re - a.re) / 2;
        return this;
    }

    /**
     * Divide by another complex number (this / z2).
     *
     * @param {Complex} z2 - Divisor
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const a = new Complex(1, 2);
     * const b = new Complex(3, 4);
     * a.divide(b); // a is now 0.44 + 0.08i (approximately)
     */
    divide = (z2) => {
        const denominator = z2.re * z2.re + z2.im * z2.im;
        const re = this.re * z2.re + this.im * z2.im;
        const im = this.im * z2.re - this.re * z2.im;
        this.re = re / denominator;
        this.im = im / denominator;
        return this;
    };

    /**
     * Complex square root √z.
     *
     * @returns {Complex} √z
     *
     * @example
     * new Complex(-1, 0).sqrt() // Complex(0, 1) or Complex(0, -1) depending on convention
     */
    sqrt() {
        const r = this.abs;
        const real = Math.sqrt((r + this.re) / 2);
        const imag = Math.sign(this.im || 1) * Math.sqrt((r - this.re) / 2);
        this.re = real;
        this.im = imag;
        return this;
    }

    /**
     * Multiply by a scalar (this * scalar).
     *
     * @param {number} scalar - Multiplier
     * @returns {Complex} This complex instance for chaining
     *
     * @example
     * const z = new Complex(2, 3);
     * z.multiplyScalar(2); // z is now 4 + 6i
     */
    multiplyScalar(scalar) {
        this.re *= scalar;
        this.im *= scalar;
        return this;
    }

    /**
     * Check equality with another complex number.
     *
     * @param {Complex} other - Complex number to compare
     * @returns {boolean} true if real and imaginary parts are exactly equal
     *
     * @example
     * new Complex(1, 2).equals(new Complex(1, 2)) // true
     * new Complex(1, 2).equals(new Complex(1, 3)) // false
     */
    equals(other) {
        return this.re === other.re && this.im === other.im;
    }
}
