import { Vec3 } from "../math/math.js";
import { Transformation} from "../../core/helion.js";
import {VectorField} from "../math/fields.js";

//
// Constants
//
export const G = 6.67e-11; // Gravitational constant
export const EC = 1.6e-19; // Coulomb charge
export const g = 9.81;
export const K = 9e9;

export class Force extends Transformation {
    constructor() {
        super();
        this._forceVector = new Vec3();
    }

    get asVector() { return this._forceVector; }

    _calculateForceOn(body) {}

    applyTo(body) {
        this._calculateForceOn(body);
        body.force.add(this._forceVector);
    }
}

export class FieldForce extends Force {
    constructor(field) {
        super();
        this._field = field;
        this._fieldVector = new Vec3();
    }

    applyTo(body) {
        this._field.sample(body.position, this._fieldVector);
        super.applyTo(body);
    }
}

export class PairForce extends Force {
    applyTo(bodyPair) {
        this._calculateForceOn(bodyPair);
        bodyPair.body1.force.sub(this._forceVector);
        bodyPair.body2.force.add(this._forceVector);
    }
}

/**
 * Calculates the Coulomb force F = q x E induced by an electric field.
 */
export class CoulombForce extends FieldForce{
    static in(electricField) {
        return new CoulombForce(electricField);
    }

    constructor(electricField) {
        super(electricField);
    }

    _calculateForceOn(body) {
        this._forceVector.copy(this._fieldVector.multiplyScalar(body.charge));
    }
}

/**
 * Calculates the Lorentz force F = q v x B induced by a magnetic field.
 */
export class LorentzForce extends FieldForce {
    static in(magneticField) {
        return new LorentzForce(magneticField);
    }

    constructor(magneticField) {
        super(magneticField);
    }

    _calculateForceOn(body) {
        this._forceVector.copy(this._fieldVector.cross(body.velocity).multiplyScalar(body.charge));
    }
}

/**
 * Drag force F = c * v.
 */
export class DragForce extends Force {
    constructor(dragCoefficient = -5.0) {
        super();
        this._dragCoefficient = dragCoefficient;
    }

    _calculateForceOn(body) {
        this._forceVector.y = this._dragCoefficient * body.velocity.y;
    }

    set dragCoefficient(value) { this._dragCoefficient = value; }
}

class UniformGravitationalField extends VectorField {
    constructor() {
        super();
        this._fieldVector = new Vec3(0, -g, 0);
    }

    sample(positionVector, target) {
        target.copy(this._fieldVector);
    }
}

/**
 * Approximate (earth) gravitational field force F = ma by a uniform gravitational field
 */
export class UniformGravitationalForce extends FieldForce {
    constructor() {
        super();
        this._field = new UniformGravitationalField();
    }

    _calculateForceOn(body) {
        this._forceVector.y = body.mass * this._fieldVector.y;
    }
}

/**
 * Newtonian gravity between a pair of two bodies:
 *
 *        m1 * m2
 *  F = G -------
 *         r * r
 */
export class GravitationalForce extends PairForce {
    constructor() {
        super();
    }

    _calculateForceOn(twoBodies) {
        const radius = twoBodies.body1.positionVectorTo(twoBodies.body2);
        const rSquared = twoBodies.body1.distanceToSquared(twoBodies.body2);
        this._forceVector.copy(
            radius.normalize().multiplyScalar(G * twoBodies.body1.mass * twoBodies.body2.mass / rSquared));
    }
}

/**
 * Hooke's law F = -k u between a pair of bodies.
 */
export class SpringForce extends PairForce {
    constructor({
        k = 200,
        restLength,
        damping = 0
    } = {}) {
        super();
        this._k = k;
        this._restLength = restLength;
        this._damping = damping;
    }

    set damping(damping) { this._damping = damping; }
    set k(bondConstant) { this._k = bondConstant; }

    _calculateForceOn(bodyPair) {
        const left = bodyPair.body1;
        const right = bodyPair.body2
        const direction = left.positionVectorTo(right);

        // Hooke's law
        const stretch = direction.length() - this._restLength;
        this._forceVector.copy(direction.normalize().multiplyScalar(-this._k * stretch));

        // Damping
        if (this._damping !== 0) {
            const relativeVelocity = right.velocity.clone().sub(left.velocity);
            const dampingForce = relativeVelocity
                .projectOnVector(left.positionVectorTo(right).normalize())
                .multiplyScalar(this._damping);
            this._forceVector.sub(dampingForce);
        }
    }
}

/**
 * Coulomb pair force:
 *
 *     k * q1 * q2 * r
 * F = ---------------
 *     |r| * |r| * |r|
 */
export class CoulombPairForce extends PairForce {
    constructor() {
        super();
        this._r = new Vec3();
    }

    _calculateForceOn(pair) {
        this._r.copy(pair.axis);
        const r2 = this._r.lengthSq();
        if (r2 <= 0)
            return;

        const r = Math.sqrt(r2);
        const magnitude = K * pair.body1.charge * pair.body2.charge / (r2 * r);
        this._forceVector.copy(this._r).multiplyScalar(magnitude);
    }
}
