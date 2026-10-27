import { describe, it, expect, beforeEach } from 'vitest';

import { DiscreteScalarField, DiscreteComplexField } from '../src/model/math/fields.js';
import { DiamondSquareOperator, GaussianImpulse, GaussianImpulseComplex2D, PerlinNoiseOperator, DoubleSlitOperator, ShapeMask, ComplexShapeMask, Softness, ComplexSoftness, SineImpulseOperator, FFTShift2D, FFT2D, LaplaceOperator } from '../src/model/transformations/operators.js';
import { ShapeConfiguration } from '../src/model/math/shapes.js';

describe('DiamondSquareOperator', () => {
    it('generates terrain-like values', () => {
        const field = new DiscreteScalarField({ nx: 17, ny: 17 });
        const op = new DiamondSquareOperator({ roughness: 1, amplitude: 10 });
        op.applyTo(field);

        // Corners should be 0
        expect(field.valueAt(0, 0)).toBe(0);
        expect(field.valueAt(16, 0)).toBe(0);
        expect(field.valueAt(0, 16)).toBe(0);
        expect(field.valueAt(16, 16)).toBe(0);

        // Interior should have values
        let hasNonZero = false;
        for (let x = 1; x < 16; x++) {
            for (let y = 1; y < 16; y++) {
                if (field.valueAt(x, y) !== 0) hasNonZero = true;
            }
        }
        expect(hasNonZero, 'Interior should have non-zero values').toBe(true);
    });
});

describe('GaussianImpulse', () => {
    it('adds Gaussian peak', () => {
        const field = new DiscreteScalarField({ nx: 20, ny: 20 });
        const op = new GaussianImpulse({ centerX: 10, centerY: 10, amplitude: 5, sigma: 2, width: 5 });
        op.applyTo(field);

        // Center should have maximum value
        expect(Math.abs(field.valueAt(10, 10) - 5) < 1e-10).toBe(true);

        // Far from center should be near 0
        expect(Math.abs(field.valueAt(0, 0)) < 1e-10).toBe(true);
    });

    it('GaussianImpulseComplex2D creates wave packet', () => {
        const field = new DiscreteComplexField({ nx: 32, ny: 32 });
        const op = new GaussianImpulseComplex2D({ wavePacketEnergy: 0.05, packetWidth: 8 });
        op.applyTo(field);

        // Should have non-zero values near center-left
        let hasNonZero = false;
        for (let x = 0; x < 15; x++) {
            for (let y = 10; y < 22; y++) {
                if (field.real[field.index(x, y)] !== 0 || field.imag[field.index(x, y)] !== 0) {
                    hasNonZero = true;
                }
            }
        }
        expect(hasNonZero, 'Wave packet should be present').toBe(true);
    });
});

describe('PerlinNoiseOperator', () => {
    it('generates noise', () => {
        const field = new DiscreteScalarField({ nx: 32, ny: 32 });
        const op = new PerlinNoiseOperator({ scale: 10, frequency: 0.1, octaves: 3 });
        op.applyTo(field);

        // Should have variation
        let min = Infinity, max = -Infinity;
        for (let x = 0; x < 32; x++) {
            for (let y = 0; y < 32; y++) {
                const v = field.valueAt(x, y);
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
        }
        expect(max > min, 'Perlin noise should have variation').toBe(true);
        expect(max <= 10 && min >= -10, 'Values should be within scale range').toBe(true);
    });
});

describe('DoubleSlitOperator', () => {
    it('creates interference pattern', () => {
        const field = new DiscreteScalarField({ nx: 50, ny: 50 });
        const op = new DoubleSlitOperator({
            wavelength: 10,
            positionSlit1: { x: -5, y: 0, z: 0 },
            positionSlit2: { x: 5, y: 0, z: 0 }
        });
        op.applyTo(field);

        // Should have interference pattern (periodic variations along x)
        let prev = field.valueAt(0, 25);
        let changes = 0;
        for (let x = 1; x < 50; x++) {
            const curr = field.valueAt(x, 25);
            if ((curr > prev && curr > 0) || (curr < prev && curr < 0)) changes++;
            prev = curr;
        }
        expect(changes > 5, 'Should have multiple fringes').toBe(true);
    });
});

describe('ShapeMask', () => {
    it('applies shape to field', () => {
        const field = new DiscreteScalarField({ nx: 20, ny: 20 });
        const shape = new ShapeConfiguration({ type: 'circle', centerX: 10, centerY: 10, radius: 5 });
        const op = new ShapeMask(shape);
        op.applyTo(field);

        // Inside circle should be 1
        expect(field.valueAt(10, 10)).toBe(1);
        // Outside should be 0
        expect(field.valueAt(0, 0)).toBe(0);
    });

    it('ComplexShapeMask applies shape to complex field', () => {
        const field = new DiscreteComplexField({ nx: 20, ny: 20 });
        const shape = new ShapeConfiguration({ type: 'circle', centerX: 10, centerY: 10, radius: 5 });
        const op = new ComplexShapeMask(shape);
        op.applyTo(field);

        expect(field.real[field.index(10, 10)]).toBe(1);
        expect(field.real[field.index(0, 0)]).toBe(0);
    });

    it('Softness modifies scalar field', () => {
        const field = new DiscreteScalarField({ nx: 10, ny: 10 });
        // Single spike in center
        field.setValueAt(5, 5, 100);
        const op = new Softness({ softness: 1 });
        op.applyTo(field);

        // Center becomes average of 4 zero neighbors = 0
        expect(field.valueAt(5, 5)).toBe(0);
        // Neighbors get 1/4 of center value = 25
        expect(field.valueAt(4, 5)).toBe(25);
        expect(field.valueAt(6, 5)).toBe(25);
        expect(field.valueAt(5, 4)).toBe(25);
        expect(field.valueAt(5, 6)).toBe(25);
    });

    it('ComplexSoftness modifies complex field', () => {
        const field = new DiscreteComplexField({ nx: 10, ny: 10 });
        field.real[field.index(5, 5)] = 100;
        const op = new ComplexSoftness({ softness: 1 });
        op.applyTo(field);

        // Center becomes average of 4 zero neighbors = 0
        expect(field.real[field.index(5, 5)]).toBe(0);
        // Neighbors get 1/4 of center value = 25
        expect(field.real[field.index(4, 5)]).toBe(25);
        expect(field.real[field.index(6, 5)]).toBe(25);
    });
});

describe('SineImpulseOperator', () => {
    it('creates sine wave', () => {
        const field = new DiscreteScalarField({ nx: 30, ny: 10 });
        const op = new SineImpulseOperator({ wavelengthInPixels: 10, amplitude: 1, periods: 2 });
        op.applyTo(field);

        // Should have 2 full periods = 4 zero crossings in first 20 pixels
        let zeroCrossings = 0;
        let prev = field.valueAt(0, 0);
        for (let x = 1; x < 20; x++) {
            const curr = field.valueAt(x, 0);
            if (prev * curr < 0) zeroCrossings++;
            prev = curr;
        }
        expect(zeroCrossings >= 3, 'Should have multiple zero crossings').toBe(true);
    });
});

describe('FFT', function () {
    it('FFTShift2D shifts quadrants', () => {
        const field = new DiscreteComplexField({ nx: 8, ny: 8 });
        // Put value at (0,0)
        field.real[0] = 42;
        const op = new FFTShift2D();
        op.applyTo(field);

        // Should move to center (4,4)
        const centerIdx = 4 * 8 + 4;
        expect(field.real[centerIdx]).toBe(42);
    });

    it('FFT2D forward and inverse are identity', () => {
        const field = new DiscreteComplexField({ nx: 8, ny: 8 });
        field.real[0] = 1;
        field.real[1] = 2;
        field.imag[5] = 3;

        const op = new FFT2D();
        op.applyTo(field);
        op.inverseTransform(field);

        expect(Math.abs(field.real[0] - 1) < 1e-10).toBe(true);
        expect(Math.abs(field.real[1] - 2) < 1e-10).toBe(true);
        expect(Math.abs(field.imag[5] - 3) < 1e-10).toBe(true);
    });
});

describe('Laplace', () => {
    it('LaplaceOperator computes discrete Laplacian', () => {
        const field = new DiscreteScalarField({nx: 5, ny: 5});
        // Constant field -> Laplacian = 0
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                field.setValueAt(x, y, 10);
            }
        }
        expect(LaplaceOperator.at(field, 2, 2)).toBe(0);

        // Parabolic field: f(x,y) = x^2 + y^2 -> Laplacian = 4
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                field.setValueAt(x, y, x * x + y * y);
            }
        }
        expect(LaplaceOperator.at(field, 2, 2)).toBe(4);
    });
});
