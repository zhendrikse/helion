import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {MultivariateFunction, RealFunction, Domain } from '../src/model/math/fields.js';
import { Interval } from '../src/model/math/math.js';
import {SurfaceResolution} from "../src/view/3d/surfaces/visualization.js";

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

    const range = func.rangeAt(1000);
    assert.ok(Math.abs(range.from) < 1e-5, 'Range of y over [-4,3] should be [0, 16]');
    assert.equal(range.to,   16, 'Range of y over [-4,3] should be [0, 16]');
});

test('Multivariate function range', () => {
    const func = new MultivariateFunction({
       domain: new Domain([1, 2], [1, 3]),
       func: (x, y, _t) => x * x + y * y
    });
    const range = func.rangeAt(new SurfaceResolution(100, 100));
    assert.equal(range.from, 2, 'Range from');
    assert.equal(range.to, 13, 'Range to');
    assert.ok(range.equals(new Interval(2, 13)));
});
