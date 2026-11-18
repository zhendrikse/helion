import { describe, it, expect } from 'vitest';
import { Gas } from '../src/model/phys/clouds.js';
import { Vec3 } from '../src/model/math/objects.js';

describe('Gas', () => {
    it('creates 3D particles at non-overlapping positions inside the container', () => {
        const gas = new Gas({
            particleCount: 20,
            containerSize: 10,
            particleRadius: 0.2,
            tracerRadius: 0.2,
            dimensions: 3
        });

        expect(gas.spheres.count).toBe(21);

        const particles = [...gas.spheres];
        for (const particle of particles) {
            expect(Math.abs(particle.position.x)).toBeLessThanOrEqual(4.8);
            expect(Math.abs(particle.position.y)).toBeLessThanOrEqual(4.8);
            expect(Math.abs(particle.position.z)).toBeLessThanOrEqual(4.8);
        }

        for (let i = 0; i < particles.length; i++)
            for (let j = i + 1; j < particles.length; j++)
                expect(particles[i].position.distanceTo(particles[j].position))
                    .toBeGreaterThanOrEqual(particles[i].radius + particles[j].radius);
    });

    it('uses the 3D Maxwell speed distribution', () => {
        const gas = new Gas({ particleCount: 1, dimensions: 3 });
        const curve = gas.computeTheoreticalCurve(3, 3, 3);

        // With <v²>=3, a²=<v²>/3=1. The 3D speed density
        // is proportional to v² exp(-v²/2).
        const expectedRatio = 9 * Math.exp(-1);
        expect(curve[1] / curve[0]).toBeCloseTo(expectedRatio);
    });

    it('retains the 2D Maxwell speed distribution', () => {
        const gas = new Gas({ particleCount: 1, dimensions: 2 });
        const curve = gas.computeTheoreticalCurve(2, 3, 3);

        // In 2D the speed density is proportional to v exp(-v²/2).
        const expectedRatio = 3 * Math.exp(-1);
        expect(curve[1] / curve[0]).toBeCloseTo(expectedRatio);
    });

    it('reflects a particle specularly at a spherical boundary', () => {
        const particle = {
            position: new Vec3(2, 0, 0),
            velocity: new Vec3(3, 4, 0)
        };

        Gas.bounceWithinSphere(particle, 1);

        expect(particle.position.length()).toBeCloseTo(1);
        expect(particle.velocity.x).toBeCloseTo(-3);
        expect(particle.velocity.y).toBeCloseTo(4);
    });

    it('keeps the segment collection in sync when particles are added and reset', () => {
        const gas = new Gas({ particleCount: 5, dimensions: 3 });

        gas.addParticles(3);
        expect(gas.spheres.count).toBe(9);

        gas.reset();
        expect(gas.spheres.count).toBe(6);
    });
});
