import test from 'node:test';
import assert from 'node:assert/strict';

import { DiscreteScalarField, DiscreteComplexField } from '../src/model/math/fields.js';
import { DiamondSquareOperator, GaussianImpulse, GaussianImpulseComplex2D, PerlinNoiseOperator, DoubleSlitOperator, ShapeMask, ComplexShapeMask, Softness, ComplexSoftness, SineImpulseOperator, FFTShift2D, FFT2D, LaplaceOperator } from '../src/model/transformations/operators.js';
import { ShapeConfiguration } from '../src/model/math/shapes.js';

test('DiamondSquareOperator generates terrain-like values', () => {
    const field = new DiscreteScalarField({ nx: 17, ny: 17 });
    const op = new DiamondSquareOperator({ roughness: 1, amplitude: 10 });
    op.applyTo(field);

    // Corners should be 0
    assert.equal(field.valueAt(0, 0), 0);
    assert.equal(field.valueAt(16, 0), 0);
    assert.equal(field.valueAt(0, 16), 0);
    assert.equal(field.valueAt(16, 16), 0);

    // Interior should have values
    let hasNonZero = false;
    for (let x = 1; x < 16; x++) {
        for (let y = 1; y < 16; y++) {
            if (field.valueAt(x, y) !== 0) hasNonZero = true;
        }
    }
    assert.ok(hasNonZero, 'Interior should have non-zero values');
});

test('GaussianImpulse adds Gaussian peak', () => {
    const field = new DiscreteScalarField({ nx: 20, ny: 20 });
    const op = new GaussianImpulse({ centerX: 10, centerY: 10, amplitude: 5, sigma: 2, width: 5 });
    op.applyTo(field);

    // Center should have maximum value
    assert.ok(Math.abs(field.valueAt(10, 10) - 5) < 1e-10);

    // Far from center should be near 0
    assert.ok(Math.abs(field.valueAt(0, 0)) < 1e-10);
});

test('GaussianImpulseComplex2D creates wave packet', () => {
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
    assert.ok(hasNonZero, 'Wave packet should be present');
});

test('PerlinNoiseOperator generates noise', () => {
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
    assert.ok(max > min, 'Perlin noise should have variation');
    assert.ok(max <= 10 && min >= -10, 'Values should be within scale range');
});

test('DoubleSlitOperator creates interference pattern', () => {
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
    assert.ok(changes > 5, 'Should have multiple fringes');
});

test('ShapeMask applies shape to field', () => {
    const field = new DiscreteScalarField({ nx: 20, ny: 20 });
    const shape = new ShapeConfiguration({ type: 'circle', centerX: 10, centerY: 10, radius: 5 });
    const op = new ShapeMask(shape);
    op.applyTo(field);

    // Inside circle should be 1
    assert.equal(field.valueAt(10, 10), 1);
    // Outside should be 0
    assert.equal(field.valueAt(0, 0), 0);
});

test('ComplexShapeMask applies shape to complex field', () => {
    const field = new DiscreteComplexField({ nx: 20, ny: 20 });
    const shape = new ShapeConfiguration({ type: 'circle', centerX: 10, centerY: 10, radius: 5 });
    const op = new ComplexShapeMask(shape);
    op.applyTo(field);

    assert.equal(field.real[field.index(10, 10)], 1);
    assert.equal(field.real[field.index(0, 0)], 0);
});

test('Softness modifies scalar field', () => {
    const field = new DiscreteScalarField({ nx: 10, ny: 10 });
    // Single spike in center
    field.setValueAt(5, 5, 100);
    const op = new Softness({ softness: 1 });
    op.applyTo(field);

    // Center becomes average of 4 zero neighbors = 0
    assert.equal(field.valueAt(5, 5), 0);
    // Neighbors get 1/4 of center value = 25
    assert.equal(field.valueAt(4, 5), 25);
    assert.equal(field.valueAt(6, 5), 25);
    assert.equal(field.valueAt(5, 4), 25);
    assert.equal(field.valueAt(5, 6), 25);
});

test('ComplexSoftness modifies complex field', () => {
    const field = new DiscreteComplexField({ nx: 10, ny: 10 });
    field.real[field.index(5, 5)] = 100;
    const op = new ComplexSoftness({ softness: 1 });
    op.applyTo(field);

    // Center becomes average of 4 zero neighbors = 0
    assert.equal(field.real[field.index(5, 5)], 0);
    // Neighbors get 1/4 of center value = 25
    assert.equal(field.real[field.index(4, 5)], 25);
    assert.equal(field.real[field.index(6, 5)], 25);
});

test('SineImpulseOperator creates sine wave', () => {
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
    assert.ok(zeroCrossings >= 3, 'Should have multiple zero crossings');
});

test('FFTShift2D shifts quadrants', () => {
    const field = new DiscreteComplexField({ nx: 8, ny: 8 });
    // Put value at (0,0)
    field.real[0] = 42;
    const op = new FFTShift2D();
    op.applyTo(field);

    // Should move to center (4,4)
    const centerIdx = 4 * 8 + 4;
    assert.equal(field.real[centerIdx], 42);
});

test('FFT2D forward and inverse are identity', () => {
    const field = new DiscreteComplexField({ nx: 8, ny: 8 });
    field.real[0] = 1;
    field.real[1] = 2;
    field.imag[5] = 3;

    const op = new FFT2D();
    op.applyTo(field);
    op.inverseTransform(field);

    assert.ok(Math.abs(field.real[0] - 1) < 1e-10);
    assert.ok(Math.abs(field.real[1] - 2) < 1e-10);
    assert.ok(Math.abs(field.imag[5] - 3) < 1e-10);
});

test('LaplaceOperator computes discrete Laplacian', () => {
    const field = new DiscreteScalarField({ nx: 5, ny: 5 });
    // Constant field -> Laplacian = 0
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
            field.setValueAt(x, y, 10);
        }
    }
    assert.equal(LaplaceOperator.at(field, 2, 2), 0);

    // Parabolic field: f(x,y) = x^2 + y^2 -> Laplacian = 4
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
            field.setValueAt(x, y, x * x + y * y);
        }
    }
    assert.equal(LaplaceOperator.at(field, 2, 2), 4);
});