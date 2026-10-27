import { describe, it, expect, beforeEach } from 'vitest';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {LindenmayerSystem, Turtle, Vec3, VecN} from '../src/model/math/objects.js';

describe('Vec3', () => {
    it('cross product', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        const expected = new Vec3(-2, 1, 0);
        expect(vec1.cross(vec2), 'Vec3 cross product').toEqual(expected);
    });

    it('length squared', () => {
        const vec1 = new Vec3(1, 2, 3);
        expect(vec1.lengthSq(), 'Vec3 lengthSq()').toBe(1 + 4 + 9);
    });

    it('dot product', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        expect(vec1.dot(vec2), 'Vec3 dot product').toBe(2 + 8 + 15);
    });

    it('add scaled vector', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        const expected = new Vec3(1 + 3 * 2, 2 + 3 * 4, 3 + 3 * 5);
        expect(vec1.addScaledVector(vec2, 3), 'Vec3 add scaled vector').toEqual(expected);
    });

    it('negate', () => {
        const vec1 = new Vec3(1, 2, 3);
        expect(vec1.negate(), 'Vec3 negate').toEqual(new Vec3(-1, -2, -3));
    });

    it('project on vector', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 0, 10);
        expect(vec1.projectOnVector(vec2), 'Vec3 projectOnVector()').toEqual(new Vec3(0, 0, 3));

        expect(vec1.projectOnVector(new Vec3()), 'Vec3 project onto zero vector').toEqual(new Vec3(0, 0, 0));
    });

    it('normalize', () => {
        const vec1 = new Vec3(1, 2, 3);
        const norm = Math.sqrt(1 + 4 + 9);
        expect(vec1.normalize(), 'Vec3 normalize').toEqual(new Vec3(1/norm, 2/norm, 3/norm));
    });

    it('distance squared to', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 3, 5);
        expect(vec1.distanceSquaredTo(vec2), 'Vec3 distance squared to').toBe(1 + 1 + 2 * 2);
    });

    it('subVectors', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 3, 5);
        expect(new Vec3().subVectors(vec1, vec2), 'Vec3 subVectors').toEqual(new Vec3(1, -1, -2));
    });

    it('divideScalar', () => {
        const vec1  = new Vec3(12, 16, 24);
        expect(vec1.divideScalar(4), 'Divide scalar').toEqual(new Vec3(3, 4, 6))
    });

    it('lerp', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(1, 4, 6);
        expect(vec1.lerp(vec2, .5), 'Vec3 subVectors').toEqual(new Vec3(1 + 0, 1 + 2, 3 + 1.5));
    });
});

describe('VecN', () => {
    it('dot product', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        const vec2 = new Float64Array([2, 2, 2, 2]);
        expect(VecN.dot(vec1, vec2), 'Dot product').toBe(2 * 1 + 2 * 2 + 2 * 3 + 2 * 4)
    });

    it('normalization', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        VecN.normalize(vec1);
        const norm = 1 / Math.sqrt(30);
        expect(vec1[0]).toBe(1 * norm);
        expect(vec1[1]).toBe(2 * norm);
        expect(vec1[2]).toBe(3 * norm);
        expect(vec1[3]).toBe(4 * norm);
    });

    it('scaling', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        VecN.scale(vec1, 3);
        expect(vec1[0]).toBe(1 * 3);
        expect(vec1[1]).toBe(2 * 3);
        expect(vec1[2]).toBe(3 * 3);
        expect(vec1[3]).toBe(4 * 3);
    });
});

describe('Lindenmayer system', () => {
    it('Dragon curve', () => {
        const lindenmayer = new LindenmayerSystem({
            name: 'Dragon curve',
            axiom: 'FX',
            rules: { F: 'F', X: 'X+YF+', Y: '-FX-Y' },
            angle: 90,
            maxIterations: 15,
            order: 4,
            startAngle: 90
        });
        expect(lindenmayer.passOnTo(new Turtle()), 'Expansion').toBe('FX+YF++-FX-YF++-FX+YF+--FX-YF++-FX+YF++-FX-YF+--FX+YF+--FX-YF+');
    });

    it('Turtle system', () => {
        const lindenmayer = new LindenmayerSystem({
            name: 'Dragon curve',
            axiom: 'FX',
            rules: { F: 'F', X: 'X+[Y]F+', Y: '-FX-Y' },
            angle: 90,
            maxIterations: 15,
            order: 5,
            startAngle: 90
        });
        const turtle = new Turtle();
        lindenmayer.passOnTo(turtle);
        expect(turtle.count, 'Number of generated line segments').toBe(32);
    });
});
