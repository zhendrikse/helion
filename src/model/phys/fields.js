import {VectorField} from "../math/fields.js";
import {Vec3} from "../math/math.js";

//
// Constants
//
export const G = 6.67e-11; // Gravitational constant
export const EC = 1.6e-19; // Coulomb charge

export class ElectricField extends VectorField {
    // Coulomb force: F = q x E
    static electricForceBetween = (particle, field) => field.multiplyScalar(particle.charge);

    constructor() {
        super();
        this._fieldVector = new Vec3();
    }

    applyTo(body) {
        this.sample(body.position, this._fieldVector);
        body.force.add(ElectricField.electricForceBetween(body, this._fieldVector));
    }
}

export class MagneticField extends VectorField {
    // Lorentz force: F = q v × B
    static magneticForceBetween = (particle, field) => field.cross(particle.velocity).multiplyScalar(particle.charge);

    constructor() {
        super();
        this._fieldVector = new Vec3();
    }

    applyTo(body) {
        this.sample(body.position, this._fieldVector);
        body.force.add(MagneticField.magneticForceBetween(body, this._fieldVector));
    }
}

/**
 * Newtonian gravity:
 *
 *        m1 * m2
 *  F = G -------
 *         r * r
 */
export class Gravity {
    forceBetween(twoBodies) {
        const radius = twoBodies.body1.positionVectorTo(twoBodies.body2);
        const rSquared = twoBodies.body1.distanceToSquared(twoBodies.body2);
        return radius.normalize().multiplyScalar(G * twoBodies.body1.mass * twoBodies.body2.mass / rSquared);
    }

    applyTo(twoBodies) {
        const force = this.forceBetween(twoBodies);
        twoBodies.body1.force.add(force);
        twoBodies.body2.force.sub(force);
    }
}

/**
 * Approximate (earth) gravitational field by a uniform gravitational field.
 */
export class UniformGravity {
    applyTo(body) {
        body.force.y -= body.mass * 9.81;
    }
}