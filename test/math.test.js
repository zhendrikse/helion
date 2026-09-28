import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {
    degToRad, generateUUID, factorial, linspace, meshgrid, Interval, Complex,
    VecN, Vec3
}
    from '../src/model/math/math.js';

test('Vec3 cross product', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(2, 4, 5);
    const expected = new Vec3(-2, 1, 0);
    assert.deepEqual(vec1.cross(vec2), expected, 'Vec3 cross product');
});

test('Vec3 length squared', () => {
    const vec1 = new Vec3(1, 2, 3);
    assert.equal(vec1.lengthSq(), 1 + 4 + 9, 'Vec3 lengthSq()');
});

test('Vec3 dot product', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(2, 4, 5);
    assert.equal(vec1.dot(vec2), 2 + 8 + 15, 'Vec3 dot product');
});

test('Vec3 add scaled vector', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(2, 4, 5);
    const expected = new Vec3(1 + 3 * 2, 2 + 3 * 4, 3 + 3 * 5);
    assert.deepEqual(vec1.addScaledVector(vec2, 3), expected, 'Vec3 add scaled vector');
});

test('Vec3 negate', () => {
    const vec1 = new Vec3(1, 2, 3);
    assert.deepEqual(vec1.negate(), new Vec3(-1, -2, -3), 'Vec3 negate');
});

test('Vec3 project on vector', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(0, 0, 10);
    assert.deepEqual(vec1.projectOnVector(vec2), new Vec3(0, 0, 3), 'Vec3 projectOnVector()');

    assert.deepEqual(vec1.projectOnVector(new Vec3()), new Vec3(0, 0, 0), 'Vec3 project onto zero vector');
});

test('Vec3 normalize', () => {
    const vec1 = new Vec3(1, 2, 3);
    const norm = Math.sqrt(1 + 4 + 9);
    assert.deepEqual(vec1.normalize(), new Vec3(1/norm, 2/norm, 3/norm), 'Vec3 normalize');
});

test('Vec3 distance squared to', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(0, 3, 5);
    assert.equal(vec1.distanceSquaredTo(vec2), 1 + 1 + 2 * 2, 'Vec3 distance squared to');
});

test('Vec3 subVectors', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(0, 3, 5);
    assert.deepEqual(new Vec3().subVectors(vec1, vec2), new Vec3(1, -1, -2), 'Vec3 subVectors');
});

test('Vec3 divideScalar', () => {
    const vec1  = new Vec3(12, 16, 24);
    assert.deepEqual(vec1.divideScalar(4), new Vec3(3, 4, 6), 'Divide scalar')
});

test('Vec3 lerp', () => {
    const vec1 = new Vec3(1, 2, 3);
    const vec2 = new Vec3(1, 4, 6);
    assert.deepEqual(vec1.lerp(vec2, .5), new Vec3(1 + 0, 1 + 2, 3 + 1.5), 'Vec3 subVectors');
});

test('VecN dot product', () => {
    const vec1  = new Float64Array([1, 2, 3, 4]);
    const vec2 = new Float64Array([2, 2, 2, 2]);
    assert.equal(VecN.dot(vec1, vec2), 2 * 1 + 2 * 2 + 2 * 3 + 2 * 4, 'Dot product')
});

test('VecN normalization', () => {
    const vec1  = new Float64Array([1, 2, 3, 4]);
    VecN.normalize(vec1);
    const norm = 1 / Math.sqrt(30);
    assert.equal(vec1[0], 1 * norm);
    assert.equal(vec1[1], 2 * norm);
    assert.equal(vec1[2], 3 * norm);
    assert.equal(vec1[3], 4 * norm);
});

test('VecN scaling', () => {
    const vec1  = new Float64Array([1, 2, 3, 4]);
    VecN.scale(vec1, 3);
    assert.equal(vec1[0], 1 * 3);
    assert.equal(vec1[1], 2 * 3);
    assert.equal(vec1[2], 3 * 3);
    assert.equal(vec1[3], 4 * 3);
});

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

test('Linspace generation', () => {
    const linSpace = linspace(1, 4, 4);
    const exptectedResult = [1, 2, 3, 4];
    assert.deepEqual(linSpace, exptectedResult, 'linspace(1, 4, 4) incorrect');
});

test('Meshgrid generation', () => {
    const xy = meshgrid(linspace(1, 3, 3), linspace(1, 2, 2));
    const expectedResult = [ [ [ 1, 2, 3 ], [ 1, 2, 3 ] ], [ [ 1, 1, 1 ], [ 2, 2, 2 ] ] ];
    assert.deepEqual(xy, expectedResult, 'meshgrid incorrectly generated');
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
