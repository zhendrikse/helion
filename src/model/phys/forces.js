import { Vec3 } from "../math/math.js";
import { Transformation} from "../../core/helion.js";

//
// Constants
//
export const G = 6.67e-11; // Gravitational constant
export const EC = 1.6e-19; // Coulomb charge
export const g = 9.81;

export class Force extends Transformation {
    constructor(field) {
        super();
        this._field = field;
        this._fieldVector = new Vec3();
        this._forceVector = new Vec3();
    }

    get asVector() { return this._forceVector; }

    _calculateForceOn(body) {
    }

    applyTo(body) {
        this._field.sample(body.position, this._fieldVector);
        this._calculateForceOn(body);
        body.force.add(this._forceVector);
    }
}

/**
 * Calculates the Coulomb force F = q x E induced by an electric field.
 */
export class CoulombForce extends Force{
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
export class LorentzForce extends Force {
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

export class DragForce extends Force {
    constructor(dragCoefficient = -5.0) {
        super();
        this._dragCoefficient = dragCoefficient;
    }

    _calculateForceOn(body) {
        this._forceVector.y = this._dragCoefficient * body.velocity.y;
    }

    applyTo(body) {
        this._calculateForceOn(body);
        body.force.add(this._forceVector);
    }
}


/**
 * Approximate (earth) gravitational field force F = ma by a uniform gravitational field.
 */
export class UniformGravitationalForce extends Force {
    constructor() {
        super();
    }

    _calculateForceOn(body) {
        this._forceVector.y = body.mass * g;
    }

    applyTo(body) {
        this._calculateForceOn(body);
        body.force.y -= this._forceVector.y;
    }
}


/**
 * Newtonian gravity between two bodies:
 *
 *        m1 * m2
 *  F = G -------
 *         r * r
 */
export class GravitationalForce extends Force {
    constructor() {
        super();
    }

    _calculateForceOn(twoBodies) {
        const radius = twoBodies.body1.positionVectorTo(twoBodies.body2);
        const rSquared = twoBodies.body1.distanceToSquared(twoBodies.body2);
        this._forceVector.copy(
            radius.normalize().multiplyScalar(G * twoBodies.body1.mass * twoBodies.body2.mass / rSquared));
    }

    applyTo(twoBodies) {
        this._calculateForceOn(twoBodies);
        twoBodies.body1.force.add(this._forceVector);
        twoBodies.body2.force.sub(this._forceVector);
    }
}