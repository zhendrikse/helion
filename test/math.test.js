import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { degToRad, generateUUID, factorial, Interval, Complex, besselJ, BESSEL_ZEROS } from '../src/model/math/math.js';

test('Degrees to radians', () => {
    assert.equal(degToRad(0), 0, 'degToRad(0)');
    assert.equal(degToRad(90), Math.PI * .5, 'degToRad(0)');
    assert.equal(degToRad(180), Math.PI, 'degToRad(0)');
});

test('UUID generation', () => {
    assert.equal(generateUUID().length, 36, 'UUID must have length 36');
});

test('Factorial generation', () => {
    assert.equal(factorial(0), 1, 'Factorial 0');
    assert.equal(factorial(1), 1, 'Factorial 1');
    assert.equal(factorial(2), 2, 'Factorial 2');
    assert.equal(factorial(3), 6, 'Factorial 3');
    assert.equal(factorial(4), 24, 'Factorial 4');
});


test('Interval scaling methods', () => {
    const interval = new Interval(0, 10);
    assert.equal(interval.normalize(5), 0.5, 'Normalization of value in interval')
    assert.equal(interval.scaleUnitParameter(interval.normalize(5)), 5, 'Inverse operations should cancel')
});

test('Complex magnitude', () => {
    const value = new Complex(3, 4);
    assert.equal(value.magnitude, 5, 'Complex magnitude');
    assert.equal(value.absSquared, 25, 'Complex magnitude');
    assert.equal(value.abs, 5, 'Complex magnitude');
});

test('Complex multiplication', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(-1, 2);
    z1.multiply(z2);
    assert.equal(z1.re, -11, 'Complex multiplication real part');
    assert.equal(z1.im, 2, 'Complex multiplication imag part');
    assert.ok(z1.equals(new Complex(-11, 2)));
});

test('Complex addition', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(-1, 2);
    z1.add(z2);
    assert.equal(z1.re, 2, 'Complex addition real part');
    assert.equal(z1.im, 6, 'Complex addition imag part');
});

test('Complex subtraction', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(-1, 2);
    z1.subtract(z2);
    assert.equal(z1.re, 4, 'Complex subtraction real part');
    assert.equal(z1.im, 2, 'Complex subtraction imag part');
});

test('Complex division', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(-1, 2);
    z1.divide(z2);
    // (3+4i)/(-1+2i) = (3+4i)(-1-2i)/5 = (-3-6i-4i+8)/5 = (5-10i)/5 = 1-2i
    assert.equal(z1.re, 1, 'Complex division real part');
    assert.equal(z1.im, -2, 'Complex division imag part');
});

test('Complex multiplyScalar', () => {
    const z = new Complex(3, 4);
    z.multiplyScalar(2);
    assert.equal(z.re, 6, 'Complex multiplyScalar real part');
    assert.equal(z.im, 8, 'Complex multiplyScalar imag part');
});

test('Complex clone', () => {
    const z1 = new Complex(3, 4);
    const z2 = z1.clone();
    assert.ok(z2.equals(z1));
    assert.notEqual(z1, z2, 'clone should return new instance');
});

test('Complex set and copy', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex();
    z2.set(5, 6);
    assert.equal(z2.re, 5);
    assert.equal(z2.im, 6);
    z2.copy(z1);
    assert.ok(z2.equals(z1));
});

test('Complex equals', () => {
    const z1 = new Complex(3, 4);
    const z2 = new Complex(3, 4);
    const z3 = new Complex(3, 5);
    assert.ok(z1.equals(z2));
    assert.ok(!z1.equals(z3));
});

test('Complex static fromPhase', () => {
    const z = Complex.fromPhase(Math.PI / 2);
    assert.ok(Math.abs(z.re) < 1e-12);
    assert.ok(Math.abs(z.im - 1) < 1e-12);
    const z2 = Complex.fromPhase(Math.PI);
    assert.ok(Math.abs(z2.re + 1) < 1e-12);
    assert.ok(Math.abs(z2.im) < 1e-12);
});

test('Complex phase', () => {
    const z = new Complex(1, 1);
    assert.ok(Math.abs(z.phase - 0.125) < 1e-12, 'phase of 1+i should be 1/8');
    const z2 = new Complex(-1, 0);
    assert.ok(Math.abs(z2.phase - 0.5) < 1e-12, 'phase of -1 should be 1/2');
});

test('Complex exp', () => {
    const z = new Complex(0, Math.PI);
    z.exp();
    // e^(i*pi) = -1
    assert.ok(Math.abs(z.re + 1) < 1e-12);
    assert.ok(Math.abs(z.im) < 1e-12);
    const z2 = new Complex(1, 0);
    z2.exp();
    assert.ok(Math.abs(z2.re - Math.E) < 1e-12);
});

test('Complex log', () => {
    const z = new Complex(-1, 0);
    z.log();
    // ln(-1) = i*pi
    assert.ok(Math.abs(z.re) < 1e-12);
    assert.ok(Math.abs(z.im - Math.PI) < 1e-12);
});

test('Complex sqrt', () => {
    const z = new Complex(-1, 0);
    z.sqrt();
    // sqrt(-1) = i
    assert.ok(Math.abs(z.re) < 1e-12);
    assert.ok(Math.abs(z.im - 1) < 1e-12);
    const z2 = new Complex(4, 0);
    z2.sqrt();
    assert.equal(z2.re, 2);
});

test('Complex sin', () => {
    const z = new Complex(0, 0);
    z.sin();
    assert.equal(z.re, 0);
    assert.equal(z.im, 0);
    const z2 = new Complex(Math.PI / 2, 0);
    z2.sin();
    assert.ok(Math.abs(z2.re - 1) < 1e-12);
});

test('besselJ: edge at zero', () => {
    assert.equal(besselJ(0, 0), 1, 'J0(0)=1');
    assert.equal(besselJ(1, 0), 0, 'J1(0)=0');
    assert.equal(besselJ(2, 0), 0, 'J2(0)=0');
    assert.equal(besselJ(4, 0), 0, 'J4(0)=0');
});

test('besselJ: odd symmetry J_m(-x)=(-1)^m J_m(x)', () => {
    const xs = [0.5, 1, 2.5, 5];
    for (const x of xs) {
        for (let m = 0; m <= 4; m++) {
            const pos = besselJ(m, x);
            const neg = besselJ(m, -x);
            const expected = (m % 2 === 0 ? 1 : -1) * pos;
            assert.ok(Math.abs(neg - expected) < 1e-12, `m=${m} x=${x} J(-x) vs (-1)^m J(x)`);
        }
    }
});

test('besselJ: spot values', () => {
    // Rreferenence taken from Abramowitz & Stegun / scipy
    assert.ok(Math.abs(besselJ(0, 1) - 0.7651976865579666) < 1e-9, 'J0(1)');
    assert.ok(Math.abs(besselJ(1, 1) - 0.4400505857449335) < 1e-9, 'J1(1)');
    assert.ok(Math.abs(besselJ(0, 2) - 0.2238907791412356) < 1e-9, 'J0(2)');
    assert.ok(Math.abs(besselJ(1, 2) - 0.5767248077568733) < 1e-9, 'J1(2)');
    assert.ok(Math.abs(besselJ(2, 2) - 0.35283402861563773) < 1e-9, 'J2(2)');
    assert.ok(Math.abs(besselJ(0, 5) - (-0.1775967713143383)) < 1e-9, 'J0(5)');
});

test('besselJ: zeros BESSEL_ZEROS', () => {
    for (const mStr of Object.keys(BESSEL_ZEROS)) {
        const m = Number(mStr);
        for (const z of BESSEL_ZEROS[m]) {
            const v = besselJ(m, z);
            // series-expansion looses a bit of precision for large x (z > 15) → tolerance 1e-4, otherwise 1e-7
            const tol = z > 15 ? 1e-4 : 1e-7;
            assert.ok(Math.abs(v) < tol, `J_${m}(${z})≈0 got ${v}`);
        }
    }
});
