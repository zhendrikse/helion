import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {generateUUID, factorial, linspace, meshgrid} from '../src/model/math/math.js';

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
})

test('Meshgrid generation', () => {
    const xy = meshgrid(linspace(1, 3, 3), linspace(1, 2, 2));
    const expectedResult = [ [ [ 1, 2, 3 ], [ 1, 2, 3 ] ], [ [ 1, 1, 1 ], [ 2, 2, 2 ] ] ];
    assert.deepEqual(xy, expectedResult, 'meshgrid incorrectly generated');
})