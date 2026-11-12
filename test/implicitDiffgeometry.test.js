import { describe, it, expect } from 'vitest';

import {
    DifferentialFrame,
    ImplicitDifferentialGeometry
} from '../src/model/math/numerics/diffgeometry.js';
import { ImplicitSurface } from '../src/model/math/surfaces.js';
import { Vec3 } from '../src/model/math/objects.js';

describe('ImplicitDifferentialGeometry', () => {
    it('on a plane has a unit normal and zero curvature', () => {
        const plane = new ImplicitSurface({
            func: (_x, y, _z) => y,
            isovalue: 0
        });
        const geometry = new ImplicitDifferentialGeometry(plane);
        const frame = new DifferentialFrame();

        const result = geometry.differentialFrameAt(new Vec3(0.3, 0, -0.2), frame);

        expect(result).toBe(frame);
        expect(Math.abs(frame.normal.length() - 1) < 1e-8).toBe(true);
        expect(Math.abs(Math.abs(frame.normal.y) - 1) < 1e-8).toBe(true);
        expect(Math.abs(frame.k1) < 1e-6).toBe(true);
        expect(Math.abs(frame.k2) < 1e-6).toBe(true);
        expect(Math.abs(frame.d1.dot(frame.normal)) < 1e-8).toBe(true);
        expect(Math.abs(frame.d2.dot(frame.normal)) < 1e-8).toBe(true);
        expect(Math.abs(frame.d1.dot(frame.d2)) < 1e-8).toBe(true);
    });

    it('on a sphere has principal curvatures 1/R', () => {
        const radius = 2;
        const sphere = new ImplicitSurface({
            func: (x, y, z) => x*x + y*y + z*z,
            isovalue: radius * radius
        });
        const geometry = new ImplicitDifferentialGeometry(sphere);
        const frame = new DifferentialFrame();

        geometry.differentialFrameAt(new Vec3(radius, 0, 0), frame);

        expect(Math.abs(frame.k1 - 1 / radius) < 1e-5).toBe(true);
        expect(Math.abs(frame.k2 - 1 / radius) < 1e-5).toBe(true);
        expect(frame.normal.x > 0.999999).toBe(true);
    });

    it('returns null where the gradient vanishes', () => {
        const sphere = new ImplicitSurface({
            func: (x, y, z) => x*x + y*y + z*z,
            isovalue: 1
        });
        const geometry = new ImplicitDifferentialGeometry(sphere);
        const frame = new DifferentialFrame();

        expect(geometry.differentialFrameAt(new Vec3(0, 0, 0), frame)).toBe(null);
    });
});
