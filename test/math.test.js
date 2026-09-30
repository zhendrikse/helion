import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { degToRad, generateUUID, factorial, Interval, Complex } from '../src/model/math/math.js';

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
    assert.ok(z1, z1.equals(new Complex(-11, 2)));
});
