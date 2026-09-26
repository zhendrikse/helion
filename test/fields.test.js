import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { RealFunction } from '../src/model/math/fields.js';
import { Interval } from '../src/model/math/math.js';

test('Real function integration', () => {
    const func = new RealFunction({
        domain: new Interval(0, 3),
        func: x => x
    });

    assert.ok(Math.abs(func.integrate() - 4.5) < 1e-8, 'Integration of x over [0,3] should be 4.5');
});


test('Real function range', () => {
    const func = new RealFunction({
        domain: new Interval(-4, 3),
        func: x => x * x
    });

    const range = func.rangeAt(100);
    assert.equal(range.from, 0, 'Range of y over [-4,3] should be [0, 16]');
    assert.equal(range.to,   16, 'Range of y over [-4,3] should be [0, 16]');
});