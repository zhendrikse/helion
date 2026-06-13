import { Complex, Vec3 } from "../math/math.js";
import { Integrators } from "../math/numerics/integrators/integrators.js";
import {Binding, MathPhysicsModelBehavior} from "../../core/helion.js";

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

//
// Point cloud
//
export class PointCloud extends MathPhysicsModelBehavior {
    constructor({
        positions = [],
        velocities = [],
        masses = [],
        colors = [],
        sizes = [],
    } = {}) {
        super();
        this._positions = positions;
        this._colors = colors;
        this._sizes = sizes;
        this._masses = masses;
        this._velocities = velocities;

        this._particleState = new PhysicsState();
    }

    particleAt(index) {
        this._particleState.position.copy(this._positions[index]);
        this._particleState.velocity.copy(this._velocities[index]);
        this._particleState.mass = this._masses[index];
        return this._particleState;
    }

    apply(dt, accelerationFn, integrator = Integrators.symplecticEulerStep) {
        for (let i = 0; i < this.length; i++) {
            const particle = this.particleAt(i);
            integrator(particle, dt, accelerationFn);
            this._positions[i] = this._particleState.position;
            this._velocities[i] = this._particleState.velocity;
        }
    }

    get length() { return this._positions.length; }

    positionAt(index) { return this._positions[index]; }
    colorAt(index) { return this._colors[index]; }
    sizeAt(index) { return this._sizes[index]; }
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
class TwoBodies {
    constructor(body1, body2) {
        this.body1 = body1;
        this.body2 = body2;
    }
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

    and(otherBody) { return new TwoBodies(this, otherBody) };

    positionVectorTo(other) { return other.position.clone().sub(this.position); }
    distanceToSquared(other) { return this.positionVectorTo(other).dot(this.positionVectorTo(other)); }
    distanceTo(other) { return this.positionVectorTo(other).length() }

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

    get direction() { return this.axis; }
    get potentialEnergy() { return 0.5 * this.k * this.displacement * this.displacement; }
    get force() { return this.axis.clone().normalize().multiplyScalar(-this.k * this.displacement); }
    get displacement() { return  this.axis.length() - this.restLength; }
    get isCompressed() { return this.axis.length() < this.restLength; }
    get endPosition() { return this.position.clone().add(this.axis); }
}

export class HarmonicOscillator extends MathPhysicsModelBehavior {
    static between = (twoBodies, k=200, radius=1, damping=0.2) => {
        return new HarmonicOscillator(twoBodies.body1, twoBodies.body2, k, radius, damping);
    }

    constructor(body1, body2, k, radius, damping) {
        super();
        this.body1 = body1;
        this.body2 = body2;
        this.bond = Spring.between(body1.and(body2), k, radius);
        this._damping = damping;
    }

    alwaysWith(view) {
        return new Binding(
            this.bond, // THIS IS DIFFERENT COMPARED TO THE DEFAULT BEHAVIOR!
            view,
            Binding.Mode.ALWAYS
        );
    }

    onceWith(view) {
        return new Binding(
            this.bond, // THIS IS DIFFERENT COMPARED TO THE DEFAULT BEHAVIOR!
            view,
            Binding.Mode.ONCE
        );
    }

    reset() {
        this.body1.reset();
        this.body2.reset();
        this.bond.reset();
    }

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

export class OneDimensionalPlaneWave extends MathPhysicsModelBehavior {
    static c = 3e8;

    constructor({
        position = new Vec3(),
        amplitude = 1,
        lambda = 2,
        omega = 2 * Math.PI * OneDimensionalPlaneWave.c / lambda
    } = {}) {
        super();
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

// TODO Refactor into PointCloud
export class DiscreteParticleField extends MathPhysicsModelBehavior {
    constructor() {
        super();
        this._particles = [];
    }

    update() {
        for (const particle of this._particles)
            particle.update();
    }

    add(particle) {
        this._particles.push(particle);
    }

    particleAt(index) {
        return this._particles[index];
    }

    get size() { return this._particles.length; }
}
