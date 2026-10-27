import { describe, it, expect, beforeEach } from 'vitest';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { degToRad, generateUUID, factorial, Interval, Complex, besselJ, BESSEL_ZEROS } from '../src/model/math/math.js';

describe('Math functions', () => {
    it('Degrees to radians', () => {
        expect(degToRad(0), 'degToRad(0)').toBe(0);
        expect(degToRad(90), 'degToRad(0)').toBe(Math.PI * .5);
        expect(degToRad(180), 'degToRad(0)').toBe(Math.PI);
    });

    it('UUID generation', () => {
        expect(generateUUID().length, 'UUID must have length 36').toBe(36);
    });

    it('Factorial generation', () => {
        expect(factorial(0), 'Factorial 0').toBe(1);
        expect(factorial(1), 'Factorial 1').toBe(1);
        expect(factorial(2), 'Factorial 2').toBe(2);
        expect(factorial(3), 'Factorial 3').toBe(6);
        expect(factorial(4), 'Factorial 4').toBe(24);
    });
});

describe('Interval', () => {
    it('Interval scaling methods', () => {
        const interval = new Interval(0, 10);
        expect(interval.normalize(5), 'Normalization of value in interval').toBe(0.5)
        expect(interval.scaleUnitParameter(interval.normalize(5)), 'Inverse operations should cancel').toBe(5)
    });
});

describe('Complex', () => {
    it('magnitude', () => {
        const value = new Complex(3, 4);
        expect(value.magnitude, 'Complex magnitude').toBe(5);
        expect(value.absSquared, 'Complex magnitude').toBe(25);
        expect(value.abs, 'Complex magnitude').toBe(5);
    });

    it('multiplication', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex(-1, 2);
        z1.multiply(z2);
        expect(z1.re, 'Complex multiplication real part').toBe(-11);
        expect(z1.im, 'Complex multiplication imag part').toBe(2);
        expect(z1.equals(new Complex(-11, 2))).toBe(true);
    });

    it('addition', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex(-1, 2);
        z1.add(z2);
        expect(z1.re, 'Complex addition real part').toBe(2);
        expect(z1.im, 'Complex addition imag part').toBe(6);
    });

    it('subtraction', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex(-1, 2);
        z1.subtract(z2);
        expect(z1.re, 'Complex subtraction real part').toBe(4);
        expect(z1.im, 'Complex subtraction imag part').toBe(2);
    });

    it('division', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex(-1, 2);
        z1.divide(z2);
        // (3+4i)/(-1+2i) = (3+4i)(-1-2i)/5 = (-3-6i-4i+8)/5 = (5-10i)/5 = 1-2i
        expect(z1.re, 'Complex division real part').toBe(1);
        expect(z1.im, 'Complex division imag part').toBe(-2);
    });

    it('multiplyScalar', () => {
        const z = new Complex(3, 4);
        z.multiplyScalar(2);
        expect(z.re, 'Complex multiplyScalar real part').toBe(6);
        expect(z.im, 'Complex multiplyScalar imag part').toBe(8);
    });

    it('clone', () => {
        const z1 = new Complex(3, 4);
        const z2 = z1.clone();
        expect(z2.equals(z1)).toBe(true);
        expect(z1, 'clone should return new instance').not.toBe(z2);
    });

    it('set and copy', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex();
        z2.set(5, 6);
        expect(z2.re).toBe(5);
        expect(z2.im).toBe(6);
        z2.copy(z1);
        expect(z2.equals(z1)).toBe(true);
    });

    it('equals', () => {
        const z1 = new Complex(3, 4);
        const z2 = new Complex(3, 4);
        const z3 = new Complex(3, 5);
        expect(z1.equals(z2)).toBe(true);
        expect(!z1.equals(z3)).toBe(true);
    });

    it('static fromPhase', () => {
        const z = Complex.fromPhase(Math.PI / 2);
        expect(Math.abs(z.re) < 1e-12).toBe(true);
        expect(Math.abs(z.im - 1) < 1e-12).toBe(true);
        const z2 = Complex.fromPhase(Math.PI);
        expect(Math.abs(z2.re + 1) < 1e-12).toBe(true);
        expect(Math.abs(z2.im) < 1e-12).toBe(true);
    });

    it('phase', () => {
        const z = new Complex(1, 1);
        expect(Math.abs(z.phase - 0.125) < 1e-12, 'phase of 1+i should be 1/8').toBe(true);
        const z2 = new Complex(-1, 0);
        expect(Math.abs(z2.phase - 0.5) < 1e-12, 'phase of -1 should be 1/2').toBe(true);
    });

    it('exp', () => {
        const z = new Complex(0, Math.PI);
        z.exp();
        // e^(i*pi) = -1
        expect(Math.abs(z.re + 1) < 1e-12).toBe(true);
        expect(Math.abs(z.im) < 1e-12).toBe(true);
        const z2 = new Complex(1, 0);
        z2.exp();
        expect(Math.abs(z2.re - Math.E) < 1e-12).toBe(true);
    });

    it('log', () => {
        const z = new Complex(-1, 0);
        z.log();
        // ln(-1) = i*pi
        expect(Math.abs(z.re) < 1e-12).toBe(true);
        expect(Math.abs(z.im - Math.PI) < 1e-12).toBe(true);
    });

    it('sqrt', () => {
        const z = new Complex(-1, 0);
        z.sqrt();
        // sqrt(-1) = i
        expect(Math.abs(z.re) < 1e-12).toBe(true);
        expect(Math.abs(z.im - 1) < 1e-12).toBe(true);
        const z2 = new Complex(4, 0);
        z2.sqrt();
        expect(z2.re).toBe(2);
    });

    it('sin', () => {
        const z = new Complex(0, 0);
        z.sin();
        expect(z.re).toBe(0);
        expect(z.im).toBe(0);
        const z2 = new Complex(Math.PI / 2, 0);
        z2.sin();
        expect(Math.abs(z2.re - 1) < 1e-12).toBe(true);
    });
});

describe('BesselJ', () => {
    it(': edge at zero', () => {
        expect(besselJ(0, 0), 'J0(0)=1').toBe(1);
        expect(besselJ(1, 0), 'J1(0)=0').toBe(0);
        expect(besselJ(2, 0), 'J2(0)=0').toBe(0);
        expect(besselJ(4, 0), 'J4(0)=0').toBe(0);
    });

    it(': odd symmetry J_m(-x)=(-1)^m J_m(x)', () => {
        const xs = [0.5, 1, 2.5, 5];
        for (const x of xs) {
            for (let m = 0; m <= 4; m++) {
                const pos = besselJ(m, x);
                const neg = besselJ(m, -x);
                const expected = (m % 2 === 0 ? 1 : -1) * pos;
                expect(Math.abs(neg - expected) < 1e-12, `m=${m} x=${x} J(-x) vs (-1)^m J(x)`).toBe(true);
            }
        }
    });

    it(': spot values', () => {
        // Rreferenence taken from Abramowitz & Stegun / scipy
        expect(Math.abs(besselJ(0, 1) - 0.7651976865579666) < 1e-9, 'J0(1)').toBe(true);
        expect(Math.abs(besselJ(1, 1) - 0.4400505857449335) < 1e-9, 'J1(1)').toBe(true);
        expect(Math.abs(besselJ(0, 2) - 0.2238907791412356) < 1e-9, 'J0(2)').toBe(true);
        expect(Math.abs(besselJ(1, 2) - 0.5767248077568733) < 1e-9, 'J1(2)').toBe(true);
        expect(Math.abs(besselJ(2, 2) - 0.35283402861563773) < 1e-9, 'J2(2)').toBe(true);
        expect(Math.abs(besselJ(0, 5) - (-0.1775967713143383)) < 1e-9, 'J0(5)').toBe(true);
    });

    it(': zeros BESSEL_ZEROS', () => {
        for (const mStr of Object.keys(BESSEL_ZEROS)) {
            const m = Number(mStr);
            for (const z of BESSEL_ZEROS[m]) {
                const v = besselJ(m, z);
                // series-expansion looses a bit of precision for large x (z > 15) → tolerance 1e-4, otherwise 1e-7
                const tol = z > 15 ? 1e-4 : 1e-7;
                expect(Math.abs(v) < tol, `J_${m}(${z})≈0 got ${v}`).toBe(true);
            }
        }
    });
});
