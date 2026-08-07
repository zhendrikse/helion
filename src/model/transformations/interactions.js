import {Vec3} from "../math/math.js";
import {Transformation} from "../../core/helion.js";

export class Bond extends Transformation {
    constructor({
        k = 200,
        restLength,
        damping = 0
    } = {}) {
        super();
        this._k = k;
        this._restLength = restLength;
        this._damping = damping;
        this._scratchVector = new Vec3();
    }

    set damping(damping) { this._damping = damping; }
    set k(bondConstant) { this._k = bondConstant; }

    applyTo(bodyPair) {
        const left = bodyPair.body1;
        const right = bodyPair.body2
        const direction = left.positionVectorTo(right);

        // Hooke's law
        const stretch = direction.length() - this._restLength;
        this._scratchVector.copy(direction.normalize().multiplyScalar(-this._k * stretch));

        // Damping
        if (this._damping !== 0) {
            const relativeVelocity = right.velocity.clone().sub(left.velocity);
            const dampingForce = relativeVelocity
                .projectOnVector(left.positionVectorTo(right).normalize())
                .multiplyScalar(this._damping);
            this._scratchVector.sub(dampingForce);
        }

        left.force.sub(this._scratchVector);
        right.force.add(this._scratchVector);
    }
}

export class SphereSphereCollision extends Transformation {
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

        // To center-of-mass frame
        const frame = body2.velocity.clone();
        body1.state.velocity.sub(frame);
        body2.state.velocity.sub(frame);

        // Projection onto normal
        const projFactor = body1.velocity.dot(r) / r.lengthSq();
        const p = r.clone().multiplyScalar(projFactor);

        // New velocities
        const totalMass = body1.mass + body2.mass;
        const v1 = body1.velocity.clone().sub(p).addScaledVector(p, (body1.mass - body2.mass) / totalMass);
        const v2 = p.clone().multiplyScalar(2 * body1.mass / totalMass);
        body1.state.velocity.copy(v1);
        body2.state.velocity.copy(v2);

        // Back to lab-frame
        body1.state.velocity.add(frame);
        body2.state.velocity.add(frame);
    }
}