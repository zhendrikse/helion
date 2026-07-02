import {Complex, Vec2, Vec3} from "../math/math.js";
import { Integrators } from "../math/numerics/integrators/integrators.js";
import {Binding, MathPhysicsModelBehavior, Simulation} from "../../core/helion.js";
import {Floor} from "../../view/3d/primitives/decorations.js";

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

export class PhysicsState {
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        mass = 1,
        charge = 0,
        acceleration = new Vec3()
    } = {}) {
        this.position = position;
        this.velocity = velocity;
        this.mass = mass;
        this.charge = charge;
        this.acceleration = acceleration;
    }

    clone() {
        return new PhysicsState({
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            mass: this.mass,
            charge: this.charge
        });
    }
}

class AccelerationVector extends MathPhysicsModelBehavior {
    constructor(parent) {
        super();
        this._parent = parent;
    }

    clone() { return new AccelerationVector(this._parent); }

    get position() { return this._parent.position; }
    get velocity() { return this._parent.velocity; }
    get acceleration() { return this._parent.acceleration; }
    get axis() { return this._parent.acceleration; }
    set axis(newAxis) { this._parent.acceleration.copy(newAxis); }
}

class VelocityVector extends MathPhysicsModelBehavior {
    constructor(parent) {
        super();
        this._parent = parent;
    }

    clone() { return new VelocityVector(this._parent); }

    get position() { return this._parent.position; }
    get velocity() { return this._parent.velocity; }
    get acceleration() { return this._parent.acceleration; }
    get axis() { return this._parent.velocity; }
    set axis(newAxis) { this._parent.velocity.copy(newAxis); }
}

//
// Bodies to do physics with
//
export class TwoBodies extends MathPhysicsModelBehavior {
    constructor(body1, body2) {
        super();
        this.body1 = body1;
        this.body2 = body2;
    }

    reset() {
        this.body1.reset?.();
        this.body2.reset?.();
    }

    get axis() { return this.body1.positionVectorTo(this.body2); }
    get position() { return this.body1.position; }
    get mass() { return this.body2.mass + this.body1.mass; }
}

export class Body extends MathPhysicsModelBehavior{
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        mass = 1,
        charge = 0
    } = {}) {
        super();
        this._state = new PhysicsState({ position, velocity, mass, charge });
        this.force = new Vec3();
        this._initialState = this._state.clone();
        this.velocityVector = new VelocityVector(this);
        this.accelerationVector = new AccelerationVector(this);
    }

    get position() { return this._state.position; }
    get velocity() { return this._state.velocity; }
    get acceleration() { return this._state.acceleration; }
    get mass() { return this._state.mass; }
    get charge() { return this._state.charge; }
    get state() { return this._state; }

    reset() {
        this._state = this._initialState.clone();
    }

    clearForce() {
        this.force.set(0, 0, 0);
    }

    fieldAt(point) {
        const rVec = point.clone().sub(this._state.position);
        const distanceSquared = rVec.dot(rVec);

        return distanceSquared < 1e-40 ?
            new Vec3(0, 0, 0) :
            rVec.normalize().multiplyScalar(this._state.charge / distanceSquared);
    }

    apply(force, dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        const accelerationFn = (bodyParam) => force.clone().multiplyScalar(1 / bodyParam.mass);
        integrator(this._state, dt, accelerationFn);
    }

    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        const accelerationFn = (bodyParam) => this.force.clone().multiplyScalar(1 / bodyParam.mass);
        integrator(this._state, dt, accelerationFn);
    }

    and(otherBody) { return new TwoBodies(this, otherBody) };

    positionVectorTo(other) { return other.position.clone().sub(this.position); }
    distanceToSquared(other) { return this.position.distanceSquaredTo(other.position); }
    distanceTo(other) { return this.position.distanceTo(other.position) }

    get kineticEnergy() { return 0.5 * this.mass * this.velocity.dot(this.velocity); }
    get momentum() { return this.mass * this.velocity; }
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
        super({ position, velocity, mass, charge });
        this.radius = radius;
        this.axis = axis.clone();
        this._initialAxis = axis.clone();
    }

    reset() {
        super.reset();
        this.axis.copy(this._initialAxis);
    }
}

export class RadialSymmetricBody extends Body {
    constructor({
        position = new Vec3(0, 0, 0),
        velocity = new Vec3(0, 0, 0),
        mass = 1,
        radius = 1,
        charge = 0
    } = {}) {
        super( {position, velocity, mass, charge})
        this.radius = radius;
    }
}

export class Block extends Body {
    constructor({
        position = new Vec3(0, 0, 0),
        velocity = new Vec3(0, 0, 0),
        size = new Vec3(1, 1, 1),
        mass = 1,
        charge = 0
    } = {}) {
        super({position, velocity, mass, charge});
        this.size = size;
    }
}

export class Bond extends MathPhysicsModelBehavior {
    static between(twoBodies, {
        k = 200,
        radius = 1,
        restLength = twoBodies.axis.length(),
        damping = 0
    } = {}) {
        return new Bond(twoBodies, k, radius, restLength, damping);
    }

    constructor(twoBodies, k, radius, restLength, damping) {
        super();
        this.radius = radius;
        this.k = k;
        this._twoBodies = twoBodies;
        this.restLength = restLength;
        this._damping = damping;
        this._scratchVector = new Vec3();
    }

    set damping(damping) { this._damping = damping; }

    get position() {
        return this._twoBodies.position;
    }

    get axis() {
        return this._twoBodies.axis;
    }

    applyForce() {
        const left = this._twoBodies.body1;
        const right = this._twoBodies.body2

        // Hooke's law
        const stretch = this.axis.length() - this.restLength;
        this._scratchVector.copy(this.axis
            .clone()
            .normalize()
            .multiplyScalar(-this.k * stretch)
        );

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

export class Lattice extends MathPhysicsModelBehavior {
    constructor() {
        super();
        this._balls = [];
        this._bonds = [];
        this._boundaryConditions = [];
    }

    addBody(body) {
        this._balls.push(body);
        return this;
    }

    addBoundaryCondition(boundaryCondition) {
        this._boundaryConditions.push(boundaryCondition);
        return this;
    }

    connect(body1, body2, {k, radius, restLength, damping}) {
        this._bonds.push(Bond.between(body1.and(body2), {
            k, radius, restLength, damping
        }));
    }

    set bondForce(value) { this._bonds.forEach(bond => bond.k = (this.size -1) * value); }

    set omega(value) { this._omega = value; }

    set damping(value) {
        for (const bond of this._bonds)
            bond.damping = value;
    }

    get size() { return this._balls.length }

    bodyAt(index) { return this._balls[index]; }

    bondAt(index) { return this._bonds[index]; }

    update(t, dt) {
        for (const boundaryCondition of this._boundaryConditions)
            boundaryCondition.apply(this, t);

        for (const ball of this._balls)
            ball.clearForce();

        for (const bond of this._bonds)
            bond.applyForce();

        for (let i = 1; i < this.size - 1; i++)
            this._balls[i].integrate(dt);
    }
}

export class Spring extends Body {
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
        this.k = k;    // spring constant
        this.time = 0; // in case user wants to visualize longitudinal waves in spring
    }

    get direction() { return this.axis; }
    get potentialEnergy() { return 0.5 * this.k * this.displacement * this.displacement; }
    get force() { return this.axis.clone().normalize().multiplyScalar(-this.k * this.displacement); }
    get displacement() { return  this.axis.length() - this.restLength; }
    get isCompressed() { return this.axis.length() < this.restLength; }
    get endPosition() { return this.position.clone().add(this.axis); }
}
