import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {linspace, Matrix2D, meshgrid} from '../src/model/math/linearalgebra.js';

test('Linspace generation', () => {
    const linSpace = linspace(1, 4, 4);
    const exptectedResult = [1, 2, 3, 4];
    assert.deepEqual(linSpace, exptectedResult, 'linspace(1, 4, 4) incorrect');

    const expected = [1, 3.25, 5.5, 7.75, 10];
    assert.deepEqual(linspace(1, 10, 5), expected, 'linspace(1, 10, 2)');
});

test('Meshgrid generation', () => {
    const xy = meshgrid(linspace(1, 3, 3), linspace(1, 2, 2));
    const expectedResult = [ [ [ 1, 2, 3 ], [ 1, 2, 3 ] ], [ [ 1, 1, 1 ], [ 2, 2, 2 ] ] ];
    assert.deepEqual(xy, expectedResult, 'meshgrid incorrectly generated');
});

test('Find 2D matrix eigenvectors', () => {
    const matrix = new Matrix2D(1, 2, 1, 0);
    const eigenValuesVectors = matrix.eigenvectors();
    assert.equal(eigenValuesVectors.length, 2, 'Two eigenvalues');
    assert.equal(eigenValuesVectors[0].value, 2, 'Eigenvalue 1');
    assert.equal(eigenValuesVectors[1].value, -1, 'Eigenvalue 2');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.x) - 0.89442719 < 1e-8, 'Eigenvector 1.x');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.y) - 0.44721359 < 1e-8, 'Eigenvector 1.y');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.z) < 1e-8, 'Eigenvector 1.z');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.x) - Math.sqrt(2) < 1e-8, 'Eigenvector 2.x');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.y) - Math.sqrt(2) < 1e-8, 'Eigenvector 2.y');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.z) < 1e-8, 'Eigenvector 2.z');
    assert.ok(Math.abs(eigenValuesVectors[0].vector.lengthSq() - 1) < 1e-10 , 'Normalized eigenvector 1');
    assert.ok(Math.abs(eigenValuesVectors[1].vector.lengthSq() - 1) < 1e-10 , 'Normalized eigenvector 2');
})
