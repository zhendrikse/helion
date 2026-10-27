import { describe, it, expect, beforeEach } from 'vitest';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {linspace, Matrix2D, meshgrid} from '../src/model/math/linearalgebra.js';

describe('Linearalgebra', () => {
    it('Linspace generation', () => {
        const linSpace = linspace(1, 4, 4);
        const exptectedResult = [1, 2, 3, 4];
        expect(linSpace, 'linspace(1, 4, 4) incorrect').toEqual(exptectedResult);

        const expected = [1, 3.25, 5.5, 7.75, 10];
        expect(linspace(1, 10, 5), 'linspace(1, 10, 2)').toEqual(expected);
    });

    it('Meshgrid generation', () => {
        const xy = meshgrid(linspace(1, 3, 3), linspace(1, 2, 2));
        const expectedResult = [ [ [ 1, 2, 3 ], [ 1, 2, 3 ] ], [ [ 1, 1, 1 ], [ 2, 2, 2 ] ] ];
        expect(xy, 'meshgrid incorrectly generated').toEqual(expectedResult);
    });

    it('Find 2D matrix eigenvectors', () => {
        const matrix = new Matrix2D(1, 2, 1, 0);
        const eigenValuesVectors = matrix.eigenvectors();
        expect(eigenValuesVectors.length, 'Two eigenvalues').toBe(2);
        expect(eigenValuesVectors[0].value, 'Eigenvalue 1').toBe(2);
        expect(eigenValuesVectors[1].value, 'Eigenvalue 2').toBe(-1);
        expect(Math.abs(eigenValuesVectors[0].vector.x) - 0.89442719 < 1e-8, 'Eigenvector 1.x').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.y) - 0.44721359 < 1e-8, 'Eigenvector 1.y').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.z) < 1e-8, 'Eigenvector 1.z').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.x) - Math.sqrt(2) < 1e-8, 'Eigenvector 2.x').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.y) - Math.sqrt(2) < 1e-8, 'Eigenvector 2.y').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.z) < 1e-8, 'Eigenvector 2.z').toBe(true);
        expect(Math.abs(eigenValuesVectors[0].vector.lengthSq() - 1) < 1e-10, 'Normalized eigenvector 1').toBe(true);
        expect(Math.abs(eigenValuesVectors[1].vector.lengthSq() - 1) < 1e-10, 'Normalized eigenvector 2').toBe(true);
    });
});
