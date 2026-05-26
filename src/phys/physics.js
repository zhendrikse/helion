/*****************
 * P H Y S I C S *
 *****************/

import { Complex, Vec3 } from "../math/math.js";
import { Integrators } from "../numerics/integrators/integrators.js";

//
// Constants
//
export const G = 6.67e-11; // Gravitational constant
export const EC = 1.6e-19; // Coulomb charge

//
// Functions
//
export function gravitationalForceBetween(twoBodies) {
    const radius = twoBodies.body1.positionVectorTo(twoBodies.body2);
    const rSquared = twoBodies.body1.distanceToSquared(twoBodies.body2);
    return radius.normalize().multiplyScalar(G * twoBodies.body1.mass * twoBodies.body2.mass / rSquared);
}

//
// Point cloud
//
export class PointCloud {
    constructor({
        positions = [],
        colors = [],
        sizes = [],
    } = {}) {
        this._positions = positions;
        this._colors = colors;
        this._sizes = sizes;
    }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    get length() { return this._positions.length; }

    positionAt(index) { return this._positions[index]; }
    colorAt(index) { return this._colors[index]; }
    sizeAt(index) { return this._sizes[index]; }
}


//
// Bodies to do physics with
//
class TwoBodies {
    constructor(body1, body2) {
        this.body1 = body1;
        this.body2 = body2;
    }
}

class AccelerationVector {
    constructor(parent) {
        this._parent = parent;
    }

    clone() { return new AccelerationVector(this._parent); }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    get position() { return this._parent.position; }
    get velocity() { return this._parent.velocity; }
    get acceleration() { return this._parent.acceleration; }
    get axis() { return this._parent.acceleration; }
    set axis(newAxis) { this._parent.acceleration.copy(newAxis); }
}

class VelocityVector {
    constructor(parent) {
        this._parent = parent;
    }

    clone() { return new VelocityVector(this._parent); }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    get position() { return this._parent.position; }
    get velocity() { return this._parent.velocity; }
    get acceleration() { return this._parent.acceleration; }
    get axis() { return this._parent.velocity; }
    set axis(newAxis) { this._parent.velocity.copy(newAxis); }
}

export class Body {
    constructor({
                    position = new Vec3(),
                    velocity = new Vec3(),
                    mass = 1
                } = {}) {
        this.acceleration = new Vec3();  // Intentionally public
        this.position = position.clone();   // Intentionally public
        this.velocity = velocity.clone();   // Intentionally public
        this.mass = mass;                   // Intentionally public
        this.velocityVector = new VelocityVector(this);
        this.accelerationVector = new AccelerationVector(this);
    }

    apply(force, dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        const accelerationFn = (bodyParam) => force.clone().multiplyScalar(1 / bodyParam.mass);
        const updatedBody = integrator(this, dt, accelerationFn);
        this.position = updatedBody.position;
        this.velocity = updatedBody.velocity;
        this.acceleration = updatedBody.acceleration;
    }

    clone() {
        return new Body({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            mass: this.mass,
            velocityVector: this.velocityVector.clone(),
            accelerationVector: this.accelerationVector.clone()
        });
    }

    and(otherBody) { return new TwoBodies(this, otherBody) };

    alwaysWith(view) { return { body: this, view: view, always: true }; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    positionVectorTo(other) { return other.position.clone().sub(this.position); }
    distanceToSquared(other) { return this.positionVectorTo(other).dot(this.positionVectorTo(other)); }
    distanceTo(other) { return this.positionVectorTo(other).length() }
}

export class AxialSymmetricBody extends Body {
    constructor({
                    position = new Vec3(),
                    velocity = new Vec3(),
                    axis = new Vec3(),
                    radius = 1,
                    mass = 1,
                    charge = 0
                } = {})  {
        super({ position, velocity, mass });
        this.charge = charge;
        this.radius = radius;
        this.axis = axis.clone();
    }

    clone() {
        return new AxialSymmetricBody({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            axis: this.axis.clone(),
            radius: this.radius,
            mass: this.mass,
            charge: this.charge
        });
    }
}

export class RadialSymmetricBody extends Body {
    constructor({
                    position = new Vec3(0, 0, 0),
                    velocity = new Vec3(0, 0, 0),
                    mass = 1,
                    radius = 1
                } = {}) {
        super( {position, velocity, mass})
        this.radius = radius;
    }

    clone() {
        return new RadialSymmetricBody({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            radius: this.radius,
            mass: this.mass,
        });
    }

    get kineticEnergy() { return 0.5 * this.mass * this.velocity.dot(this.velocity); }
    get potentialEnergy() { return this.mass * G * this.position.y; }
    get momentum() { return this.mass * this.velocity; }
}

export class Block extends Body {
    constructor({
                    position = new Vec3(0, 0, 0),
                    velocity = new Vec3(0, 0, 0),
                    size = new Vec3(1, 1, 1),
                    mass = 1,
                    charge = 0
                } = {}) {
        super({position, velocity, mass});
        this.size = size;
        this.charge = charge;
    }

    clone() {
        return new Block({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            size: this.size.clone(),
            mass: this.mass,
            charge: this.charge
        });
    }
}

export class Particle extends Body {
    static fieldAt(body, point) {
        const rVec = point.clone().sub(body.position);
        const distanceSquared = rVec.dot(rVec);

        return distanceSquared < 1e-40 ?
            new Vec3(0, 0, 0) :
            rVec.normalize().multiplyScalar(body.charge / distanceSquared);
    }

    constructor({
                    position = new Vec3(0, 0, 0),
                    velocity = new Vec3(0, 0, 0),
                    mass = 1,
                    radius = 1,
                    charge = 0
                } = {}) {
        super( {position, velocity, mass})
        this.charge = charge;
        this.radius = radius;
    }

    clone() {
        return new Particle({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            radius: this.radius,
            mass: this.mass,
            charge: this.charge
        });
    }

    fieldAt(point) { return Particle.fieldAt(this, point); }

    get kineticEnergy() { return 0.5 * this.mass * this.velocity.dot(this.velocity); }
    get momentum() { return this.mass * this.velocity; }
}

export class Spring extends Body {
    static between(twoBodies, k = 200, radius = 1) {
        const axis = twoBodies.body1.positionVectorTo(twoBodies.body2);
        const position = twoBodies.body1.position;
        return new Spring({position, axis, k, radius});
    }

    constructor({
                    position = new Vec3(),
                    velocity = new Vec3(),
                    axis = new Vec3(0, 1, 0),
                    mass = 1,
                    radius = 1,
                    k=100
                } = {}) {
        super({ position, velocity, mass });
        this.axis = axis;
        this.radius = radius;
        this.restLength = axis.length();
        this.k = k; // spring constant
    }

    clone() {
        return new Spring({
            position: this.position.clone(),
            axis: this.axis.clone(),
            k: this.k,
            radius: this.radius,
            mass: this.mass
        });
    }

    get direction() { return this.axis; }
    get potentialEnergy() { return 0.5 * this.k * this.displacement * this.displacement; }
    get force() { return this.axis.clone().normalize().multiplyScalar(-this.k * this.displacement); }
    get displacement() { return  this.axis.length() - this.restLength; }
    get isCompressed() { return this.axis.length() < this.restLength; }
    get endPosition() { return this.position.clone().add(this.axis); }
}

export class HarmonicOscillator {
    static between = (twoBodies, k=200, radius=1, damping=0.2) => {
        return new HarmonicOscillator(twoBodies.body1, twoBodies.body2, k, radius, damping);
    }

    constructor(body1, body2, k, radius, damping) {
        this.body1 = body1;
        this.body2 = body2;
        this.bond = Spring.between(body1.and(body2), k, radius);
        this._damping = damping;
    }

    alwaysWith(view) { return { body: this.bond, view: view, always: true}; };
    onceWith(view) { return { body: this.bond, view: view, always: false}; };

    oscillate(dt, integrator = Integrators.symplecticEulerStep) {
        const delta = this.body1.positionVectorTo(this.body2);
        const length = delta.length();
        const direction = delta.clone().normalize();

        const forceMagnitude = -this.bond.k * (length - this.bond.restLength);
        const force = direction.multiplyScalar(forceMagnitude);

        const relativeVelocity = this.body1.velocity.clone().sub(this.body2.velocity);
        const dampingForce = relativeVelocity
            .projectOnVector(direction)
            .multiplyScalar(this._damping);
        force.add(dampingForce);

        this.body1.apply(force.clone().negate(), dt, integrator);
        this.body2.apply(force, dt, integrator);

        this.bond.position.copy(this.body1.position);
        this.bond.axis = delta;
    }

    decompress(amount) { this.compress(-amount); }

    compress(amount) {
        this.body1.position.add(new Vec3(amount, 0, 0));
        this.body2.position.sub(new Vec3(amount, 0, 0));
        this.bond.position.copy(this.body1.position);
        this.bond.axis = this.body1.positionVectorTo(this.body2);
    }
}

export class OneDimensionalPlaneWave {
    static c = 3e8;

    constructor({
                    position = new Vec3(),
                    amplitude = 1,
                    lambda = 2,
                    omega = 2 * Math.PI * OneDimensionalPlaneWave.c / lambda
                } = {}) {
        this.position = position.clone();
        this.amplitude = amplitude;
        this.omega = omega;
        this._lambda = lambda;
        this._time = 0;
        this._k = 2 * Math.PI / lambda;
    }

    set lambda(lambdaValue) { this._lambda = lambdaValue; this._k = 2 * Math.PI / lambdaValue; }
    set k(kValue) { this._k = kValue; this._lambda = kValue / 2 * Math.PI; }
    get lambda() { return this._lambda; }
    get k() { return this._k; }

    alwaysWith(view) { return { body: this, view: view, always: true}; };
    onceWith(view) { return { body: this, view: view, always: false}; };

    propagate(t) { this._time = t; }

    valueAt(x) {
        return this.amplitude * Math.cos(this.k * x - this.omega * this._time);
    }
}

export class OneDimensionalComplexPlaneWave extends OneDimensionalPlaneWave {
    constructor({
                    position = new Vec3(),
                    amplitude = 1,
                    lambda = 2,
                    omega = 3 * Math.PI
                } = {}) {
        super({position, amplitude, lambda, omega });
    }

    valueAt(x) {
        const phase = this.k * x - this.omega * this._time;
        return new Complex( Math.cos(phase) * this.amplitude, Math.sin(phase) * this.amplitude);
    }
}
