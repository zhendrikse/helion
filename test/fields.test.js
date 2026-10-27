import { describe, it, expect, beforeEach } from 'vitest';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {MultivariateFunction, RealFunction, Domain } from '../src/model/math/fields.js';
import { Interval } from '../src/model/math/math.js';
import {SurfaceResolution} from "../src/view/3d/surfaces/visualization.js";

describe('Field', function() {
    it('Real function integration', () => {
        const func = new RealFunction({
            domain: new Interval(0, 3),
            func: x => x
        });

        expect(Math.abs(func.integrate() - 4.5) < 1e-8, 'Integration of x over [0,3] should be 4.5').toBe(true);
    });


    it('Real function range', () => {
        const func = new RealFunction({
            domain: new Interval(-4, 3),
            func: x => x * x
        });

        const range = func.rangeAt(1000);
        expect(Math.abs(range.from) < 1e-5, 'Range of y over [-4,3] should be [0, 16]').toBe(true);
        expect(range.to, 'Range of y over [-4,3] should be [0, 16]').toBe(16);
    });

    it('Multivariate function range', () => {
        const func = new MultivariateFunction({
            domain: new Domain([1, 2], [1, 3]),
            func: (x, y, _t) => x * x + y * y
        });
        const range = func.rangeAt(new SurfaceResolution(100, 100));
        expect(range.from, 'Range from').toBe(2);
        expect(range.to, 'Range to').toBe(13);
        expect(range.equals(new Interval(2, 13))).toBe(true);
    });
});
