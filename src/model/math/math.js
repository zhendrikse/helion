import { Vec3 } from './objects.js'

/**
 * Bessel J_m (integer m) via series: J_m(x)= sum (-1)^k (x/2)^(2k+m)/(k! (k+m)!)
 * 
 * @param {number} m 
 * @param {number} x 
 * @returns {number}
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

/** @param {number} angle */
export function degToRad(angle) {
    return angle * Math.PI / 180;
}

/**
 * @param {number} radius 
 * @param {number} theta 
 * @param {number} phi 
 * @returns {Vec3}
 */
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
 * @param {number} mu Average.
 * @param {number} sigma Standard deviation
 * @returns A normally distributed number.
 */
export function normalDistribution(mu, sigma) {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma + mu;
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * @param {number} min
 * @param {number} max
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
 * @param {number} min
 * @param {number} max
 */
export function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** @param {number} n */
export function factorial(n) {
    let result = 1;
    for (let i=2; i<=n; i++)
        result *= i;
    return result;
}

export class Range {
    /**
     * @param {number} from
     * @param {number} to
     * @param {number} stepSize
     */
    constructor(from, to, stepSize) {
        this.from = from;
        this.to = to;
        this.stepSize = stepSize || 0.1;
    }

    /** @returns {Generator<number, void, number>} */
    *[Symbol.iterator]() {
        if (!isFinite(this.from) || !isFinite(this.to))
            throw new Error('Cannot iterate over an infinite interval.');
        if (this.stepSize <= 0)
            throw new Error('stepSize must be > 0');

        const n = Math.floor((this.to - this.from) / this.stepSize);
        for (let i = 0; i <= n; i++)
            yield this.from + i * this.stepSize;
    }

    get count() {
        return Math.floor((this.to - this.from) / this.stepSize) + 1;
    }
}

export class Interval {
    constructor(from, to) {
        if (from == null || to == null || from === to)
            throw new Error(`Invalid construction of interval [${from}, ${to}]`);
        this.from = from;
        this.to = to;
    }

    /**
     * Resize the interval to include the value given.
     *
     * @param {number} value modify the interval to include this value, if it isn't already included.
     */
    include(value) {
        if (value < this.from) this.from = value;
        if (value > this.to)   this.to = value;
    }

    /**
     * Normalize a value with respect to this interval, i.e. treat the range as 1.
     *
     * @param {number} value The value in the interval to be normalized.
     * @returns {number|number} The normalized value.
     */
    normalize = value => this.to === this.from ? 0 : (value - this.from) / this.range;

    get range() { return this.to - this.from; }
    get min() { return this.from; }
    get max() { return this.to; }

    /** @param {Interval} other */
    equals(other) {
        return this.from === other.from && this.to === other.to;
    }

    /**
     * Scale a unit parameter [0, 1] up to this interval
     * @param {number} unitParameter the parameter that runs from [0, 1]
     * @returns {number} the scaled parameter
     */
    scaleUnitParameter = unitParameter => this.range * unitParameter + this.from;
}

export class Complex {
    /** @param {number} theta */
    static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));

    /**
     * @param {number} re 
     * @param {number} im 
     */
    constructor(re = 0, im = 0) {
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

    /**
     * @param {number} real 
     * @param {number} imag 
     */
    set(real, imag) {
        this.re = real;
        this.im = imag;
        return this;
    }

    /** @param {Complex} complex */
    copy(complex) {
        this.re = complex.re;
        this.im = complex.im;
        return this;
    }

    /** @param {Complex} complex */
    multiply(complex) {
        const real = this.re * complex.re - this.im * complex.im;
        const imag = this.re * complex.im + this.im * complex.re;
        this.re = real;
        this.im = imag;
        return this;
    }

    /** @param {Complex} complex */
    add(complex) {
        this.re += complex.re;
        this.im += complex.im;
        return this;
    }

    /** @param {Complex} complex */
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

    /** @param {Complex} z2 */
    divide = (z2) => {
        const denominator = z2.re * z2.re + z2.im * z2.im;
        const re = this.re * z2.re + this.im * z2.im;
        const im = this.im * z2.re - this.re * z2.im;
        this.re = re / denominator;
        this.im = im / denominator;
        return this;
    };

    sqrt() {
        const r = this.abs;
        const real = Math.sqrt((r + this.re) / 2);
        const imag = Math.sign(this.im || 1) * Math.sqrt((r - this.re) / 2);
        this.re = real;
        this.im = imag;
        return this;
    }

    /** @param {number} scalar */
    multiplyScalar(scalar) {
        this.re *= scalar;
        this.im *= scalar;
        return this;
    }

    /** @param {Complex} other */
    equals(other) {
        return this.re === other.re && this.im === other.im;
    }
}



