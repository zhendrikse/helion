import {Transformation} from '../behavior.js';

export class SphereSphereCollision extends Transformation {
    /**
     * @param {number} restitution Coefficient of restitution in the range [0, 1].
     * 1 is fully elastic; 0 is fully inelastic along the collision normal.
     */
    constructor(restitution = 1) {
        super();
        if (!Number.isFinite(restitution) || restitution < 0 || restitution > 1)
            throw new RangeError('Restitution must be a finite number between 0 and 1.');

        this._restitution = restitution;
    }

    applyTo(bodyPair) {
        const body1 = bodyPair.body1;
        const body2 = bodyPair.body2;
        const r = bodyPair.axis;
        const distance = r.length();
        const minDist = body1.radius + body2.radius;

        if (distance === 0 || distance >= minDist)
            return;

        // Penetration correction
        const overlap = minDist - distance;
        const n = r.clone().normalize();

        let body1Adjust = 0.5;
        let body2Adjust = 0.5;
        if (body1.radius > body2.radius) {
            body1Adjust = 0;
            body2Adjust = 1;
        } else if (body1.radius < body2.radius) {
            body1Adjust = 1;
            body2Adjust = 0;
        }

        body1.state.position.addScaledVector(n, -body1Adjust * overlap);
        body2.state.position.addScaledVector(n,  body2Adjust * overlap);

        // Apply an impulse only when the bodies are approaching one another.
        const relativeVelocity = body2.velocity.clone().sub(body1.velocity);
        const normalSpeed = relativeVelocity.dot(n);
        if (normalSpeed >= 0)
            return;

        const inverseMass1 = 1 / body1.mass;
        const inverseMass2 = 1 / body2.mass;
        const impulseMagnitude = -(1 + this._restitution) * normalSpeed /
            (inverseMass1 + inverseMass2);
        const impulse = n.multiplyScalar(impulseMagnitude);

        body1.state.velocity.addScaledVector(impulse, -inverseMass1);
        body2.state.velocity.addScaledVector(impulse, inverseMass2);
    }
}