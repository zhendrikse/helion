
import { describe, it, expect, beforeEach } from 'vitest';
import { Vec3 } from '../src/model/math/objects.js';
import { SphereSphereCollision } from '../src/model/transformations/interactions.js';

describe('SphereSphereCollision', () => {
    let collision;

    let body1;
    let body2;
    let bodyPair;

    beforeEach(() => {
        collision = new SphereSphereCollision();

        body1 = {
            radius: 1,
            mass: 1,
            state: {
                position: new Vec3(0, 0, 0),
                velocity: new Vec3(1, 0, 0)
            },
            get velocity() {
                return this.state.velocity;
            }
        };

        body2 = {
            radius: 1,
            mass: 1,
            state: {
                position: new Vec3(1.5, 0, 0),
                velocity: new Vec3(-1, 0, 0)
            },
            get velocity() {
                return this.state.velocity;
            }
        };

        bodyPair = {
            body1,
            body2,
            axis: new Vec3(1.5, 0, 0)
        };
    });

    describe('constructor', () => {
        it('uses a restitution of 1 by default', () => {
            // Twee gelijke bollen botsen elastisch.
            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(-1);
            expect(body2.state.velocity.x).toBeCloseTo(1);
        });

        it('accepts a restitution of 0', () => {
            expect(() => new SphereSphereCollision(0))
                .not.toThrow();
        });

        it('accepts a restitution of 1', () => {
            expect(() => new SphereSphereCollision(1))
                .not.toThrow();
        });

        it('rejects a restitution below 0', () => {
            expect(() => new SphereSphereCollision(-0.1))
                .toThrow(RangeError);
        });

        it('rejects a restitution above 1', () => {
            expect(() => new SphereSphereCollision(1.1))
                .toThrow(RangeError);
        });

        it('rejects NaN', () => {
            expect(() => new SphereSphereCollision(NaN))
                .toThrow(RangeError);
        });

        it('rejects Infinity', () => {
            expect(() => new SphereSphereCollision(Infinity))
                .toThrow(RangeError);
        });
    });

    describe('applyTo', () => {
        it('does nothing when the spheres are not overlapping', () => {
            body2.state.position.set(2, 0, 0);
            body2.state.velocity.set(-1, 0, 0);
            bodyPair.axis.set(2, 0, 0);

            collision.applyTo(bodyPair);

            expect(body1.state.position.x).toBeCloseTo(0);
            expect(body2.state.position.x).toBeCloseTo(2);
            expect(body1.state.velocity.x).toBeCloseTo(1);
            expect(body2.state.velocity.x).toBeCloseTo(-1);
        });

        it('does nothing when the distance is zero', () => {
            body2.state.position.set(0, 0, 0);
            bodyPair.axis.set(0, 0, 0);

            collision.applyTo(bodyPair);

            expect(body1.state.position.x).toBeCloseTo(0);
            expect(body2.state.position.x).toBeCloseTo(0);
            expect(body1.state.velocity.x).toBeCloseTo(1);
            expect(body2.state.velocity.x).toBeCloseTo(-1);
        });

        it('corrects the overlap between equally sized spheres', () => {
            collision.applyTo(bodyPair);

            expect(body1.state.position.x).toBeCloseTo(-0.25);
            expect(body2.state.position.x).toBeCloseTo(1.75);
        });

        it('applies an elastic collision impulse', () => {
            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(-1);
            expect(body2.state.velocity.x).toBeCloseTo(1);
        });

        it('applies an inelastic collision when restitution is 0', () => {
            collision = new SphereSphereCollision(0);

            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(0);
            expect(body2.state.velocity.x).toBeCloseTo(0);
        });

        it('does not apply an impulse when the spheres are separating', () => {
            body1.state.velocity.set(-1, 0, 0);
            body2.state.velocity.set(1, 0, 0);

            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(-1);
            expect(body2.state.velocity.x).toBeCloseTo(1);
        });

        it('does not apply an impulse when the normal speed is zero', () => {
            body1.state.velocity.set(0, 1, 0);
            body2.state.velocity.set(0, -1, 0);

            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(0);
            expect(body2.state.velocity.x).toBeCloseTo(0);
            expect(body1.state.velocity.y).toBeCloseTo(1);
            expect(body2.state.velocity.y).toBeCloseTo(-1);
        });

        it('moves the smaller sphere completely out of the overlap', () => {
            body1.radius = 2;
            body2.radius = 1;

            collision.applyTo(bodyPair);

            expect(body1.state.position.x).toBeCloseTo(0);
            expect(body2.state.position.x).toBeCloseTo(3);
        });

        it('moves the smaller first sphere completely out of the overlap', () => {
            body1.radius = 1;
            body2.radius = 2;

            collision.applyTo(bodyPair);

            expect(body1.state.position.x).toBeCloseTo(-1.5);
            expect(body2.state.position.x).toBeCloseTo(1.5);
        });

        it('handles spheres with different masses', () => {
            body1.mass = 1;
            body2.mass = 3;

            collision.applyTo(bodyPair);

            expect(body1.state.velocity.x).toBeCloseTo(-2);
            expect(body2.state.velocity.x).toBeCloseTo(0);
        });

        it('does not mutate the collision axis', () => {
            const originalAxis = bodyPair.axis.clone();

            collision.applyTo(bodyPair);

            expect(bodyPair.axis.x).toBeCloseTo(originalAxis.x);
            expect(bodyPair.axis.y).toBeCloseTo(originalAxis.y);
            expect(bodyPair.axis.z).toBeCloseTo(originalAxis.z);
        });
    });
});
