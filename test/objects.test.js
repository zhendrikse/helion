import { describe, it, expect, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import {LindenmayerSystem, Turtle, Vec3, VecN} from '../src/model/math/objects.js';

describe('Vec3', () => {
    it('cross product', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        const expected = new Vec3(-2, 1, 0);
        assert.deepEqual(vec1.cross(vec2), expected, 'Vec3 cross product');
    });

    it('length squared', () => {
        const vec1 = new Vec3(1, 2, 3);
        assert.equal(vec1.lengthSq(), 1 + 4 + 9, 'Vec3 lengthSq()');
    });

    it('dot product', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        assert.equal(vec1.dot(vec2), 2 + 8 + 15, 'Vec3 dot product');
    });

    it('add scaled vector', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(2, 4, 5);
        const expected = new Vec3(1 + 3 * 2, 2 + 3 * 4, 3 + 3 * 5);
        assert.deepEqual(vec1.addScaledVector(vec2, 3), expected, 'Vec3 add scaled vector');
    });

    it('negate', () => {
        const vec1 = new Vec3(1, 2, 3);
        assert.deepEqual(vec1.negate(), new Vec3(-1, -2, -3), 'Vec3 negate');
    });

    it('project on vector', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 0, 10);
        assert.deepEqual(vec1.projectOnVector(vec2), new Vec3(0, 0, 3), 'Vec3 projectOnVector()');

        assert.deepEqual(vec1.projectOnVector(new Vec3()), new Vec3(0, 0, 0), 'Vec3 project onto zero vector');
    });

    it('normalize', () => {
        const vec1 = new Vec3(1, 2, 3);
        const norm = Math.sqrt(1 + 4 + 9);
        assert.deepEqual(vec1.normalize(), new Vec3(1/norm, 2/norm, 3/norm), 'Vec3 normalize');
    });

    it('distance squared to', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 3, 5);
        assert.equal(vec1.distanceSquaredTo(vec2), 1 + 1 + 2 * 2, 'Vec3 distance squared to');
    });

    it('subVectors', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(0, 3, 5);
        assert.deepEqual(new Vec3().subVectors(vec1, vec2), new Vec3(1, -1, -2), 'Vec3 subVectors');
    });

    it('divideScalar', () => {
        const vec1  = new Vec3(12, 16, 24);
        assert.deepEqual(vec1.divideScalar(4), new Vec3(3, 4, 6), 'Divide scalar')
    });

    it('lerp', () => {
        const vec1 = new Vec3(1, 2, 3);
        const vec2 = new Vec3(1, 4, 6);
        assert.deepEqual(vec1.lerp(vec2, .5), new Vec3(1 + 0, 1 + 2, 3 + 1.5), 'Vec3 subVectors');
    });
});

describe('VecN', () => {
    it('dot product', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        const vec2 = new Float64Array([2, 2, 2, 2]);
        assert.equal(VecN.dot(vec1, vec2), 2 * 1 + 2 * 2 + 2 * 3 + 2 * 4, 'Dot product')
    });

    it('normalization', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        VecN.normalize(vec1);
        const norm = 1 / Math.sqrt(30);
        assert.equal(vec1[0], 1 * norm);
        assert.equal(vec1[1], 2 * norm);
        assert.equal(vec1[2], 3 * norm);
        assert.equal(vec1[3], 4 * norm);
    });

    it('scaling', () => {
        const vec1  = new Float64Array([1, 2, 3, 4]);
        VecN.scale(vec1, 3);
        assert.equal(vec1[0], 1 * 3);
        assert.equal(vec1[1], 2 * 3);
        assert.equal(vec1[2], 3 * 3);
        assert.equal(vec1[3], 4 * 3);
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
       assert.equal(lindenmayer.passOnTo(new Turtle()), 'FX+YF++-FX-YF++-FX+YF+--FX-YF++-FX+YF++-FX-YF+--FX+YF+--FX-YF+', 'Expansion');
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
        assert.equal(turtle.count, 32, 'Number of generated line segments');
    });
});

