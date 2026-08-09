import { Vec3} from "../math/math.js";
import { Integrators } from "../math/numerics/integrators/integrators.js";
import { MathPhysicsModelBehavior } from "../../core/helion.js";
import {BondForce} from "./forces.js";

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
export class BodyPair extends MathPhysicsModelBehavior {
    constructor(body1, body2) {
        super();
        this.body1 = body1;
        this.body2 = body2;
    }

    reset() {
        this.body1.reset?.();
        this.body2.reset?.();
    }

    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        this.body1.integrate(dt, integrator);
        this.body2.integrate(dt, integrator);
    }

    get radius() { return .5 * (this.body1.radius + this.body2.radius); }
    get axis() { return this.body1.positionVectorTo(this.body2); }
    get position() { return this.body1.position; }
    get mass() { return this.body2.mass + this.body1.mass; }
}

export class Body extends MathPhysicsModelBehavior{
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        mass = 1,
        charge = 0,
        fixed = false
    } = {}) {
        super();
        this._state = new PhysicsState({ position, velocity, mass, charge });
        this._force = new Vec3();
        this._initialState = this._state.clone();
        this._fixed = fixed;
        this.velocityVector = new VelocityVector(this);
        this.accelerationVector = new AccelerationVector(this);
    }

    get position() { return this._state.position; }
    get velocity() { return this._state.velocity; }
    get acceleration() { return this._state.acceleration; }
    get mass() { return this._state.mass; }
    get charge() { return this._state.charge; }
    get state() { return this._state; }
    get force() { return this._force; }

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

    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        if (this.fixed)
            return;

        const accelerationFn = (bodyParam) => this.force.clone().multiplyScalar(1 / bodyParam.mass);
        integrator(this._state, dt, accelerationFn);
        this._force.set(0, 0, 0);
    }

    and(otherBody) { return new BodyPair(this, otherBody) };

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
        charge = 0,
        fixed = false
    } = {})  {
        super({ position, velocity, mass, charge, fixed });
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
        charge = 0,
        fixed = false
    } = {}) {
        super( {position, velocity, mass, charge, fixed })
        this.radius = radius;
    }
}

export class Block extends Body {
    constructor({
        position = new Vec3(0, 0, 0),
        velocity = new Vec3(0, 0, 0),
        size = new Vec3(1, 1, 1),
        mass = 1,
        charge = 0,
        fixed = false
    } = {}) {
        super({position, velocity, mass, charge, fixed });
        this.size = size;
    }
}

export class Lattice extends MathPhysicsModelBehavior {
    constructor({
        k = 100,
        damping = 0.2,
        bodySize = 7.5e-2,
        bondRadius = 0.33 * bodySize
    } = {}) {
        super();
        this._k = k;
        this._damping = damping;
        this._bodySize = bodySize;
        this._bondRadius = bondRadius;
        this._bodies = [];
        this._bonds = [];
        this._bondForces = [];
        this._boundaryConditions = [];
    }

    get damping() { return this._damping; }
    get bondRadius() { return this._bondRadius; }
    get bodySize() { return this._bodySize; }
    get k () { return this._k; }

    set damping(damping) {
        for (const coupling of this._bondForces)
            coupling.damping = damping;
            this._damping = damping;
    }

    fixateBodyAt(index) {
        this._bodies[index].fixed = true;
        return this;
    }

    addBody(body) {
        this._bodies.push(body);
        return this;
    }

    addBoundaryCondition(boundaryCondition) {
        this._boundaryConditions.push(boundaryCondition);
        return this;
    }

    connect(body1, body2, {k, restLength, damping}) {
        this._bonds.push(body1.and(body2));
        this._bondForces.push(new BondForce({k, restLength, damping}));
    }

    set bondForce(value) { this._bondForces.forEach(bond => bond.k = value); }

    set omega(value) { this._omega = value; }

    get bodyCount() { return this._bodies.length }
    get bondCount() { return this._bonds.length }

    bodyAt(index) { return this._bodies[index]; }

    bondAt(index) { return this._bonds[index]; }

    update(t, dt) {
        for (const boundaryCondition of this._boundaryConditions)
            boundaryCondition.applyTo(this, t);

        for (let i = 0; i < this.bondCount; i++)
            this._bonds[i].apply(this._bondForces[i]);

        for (const body of this._bodies)
            body.integrate(dt);
    }

    reset() {
        for (const body of this._bodies)
            body.reset();

        for (const bond of this._bonds)
            bond.reset();
    }
}

export class ChainTopology {
    constructor({
        count = 100,
        length = 20,
        totalMass = 0.025
    } = {}) {
        this._count = count;
        this._length = length;
        this._totalMass = totalMass;
    }

    applyTo(lattice) {
        const dx = this._length / (this._count - 1);

        for (let i = 0; i < this._count; i++)
            lattice.addBody(new RadialSymmetricBody({
                radius: lattice.bodySize,
                mass: this._totalMass / this._count,
                position: new Vec3(-this._length / 2 + i * dx, 0, 0)
            }));

        for (let i = 0; i < this._count - 1; i++)
            lattice.connect(lattice.bodyAt(i), lattice.bodyAt(i + 1), {
                k: lattice.k,
                restLength: 0.9 * this._length / (this._count - 1),
                damping: lattice.damping
            });
    }
}

export class CubicLatticeTopology {
    constructor({
        nx = 4,
        ny = 4,
        nz = 4,
        spacing = 0.3,
        totalMass = 1
    } = {}) {
        this._nx = nx;
        this._ny = ny;
        this._nz = nz;

        this._spacing = spacing;
        this._totalMass = totalMass;
    }

    applyTo(lattice) {
        const count = this._nx * this._ny * this._nz;
        const mass = this._totalMass / count;

        // Bodies
        for (let k = 0; k < this._nz; k++)
            for (let j = 0; j < this._ny; j++)
                for (let i = 0; i < this._nx; i++)
                    lattice.addBody(new RadialSymmetricBody({
                        radius: lattice.bodySize,
                        mass,
                        position: new Vec3(
                            (i - (this._nx - 1) / 2) * this._spacing,
                            (j - (this._ny - 1) / 2) * this._spacing,
                            (k - (this._nz - 1) / 2) * this._spacing
                        )
                    }));

        // Bonds
        for (let k = 0; k < this._nz; k++)
            for (let j = 0; j < this._ny; j++)
                for (let i = 0; i < this._nx; i++) {
                    const current = lattice.bodyAt(this.index(i, j, k));

                    if (i + 1 < this._nx)
                        lattice.connect(
                            current,
                            lattice.bodyAt(this.index(i + 1, j, k)),
                            this.bondConfig(lattice)
                        );

                    if (j + 1 < this._ny)
                        lattice.connect(
                            current,
                            lattice.bodyAt(this.index(i, j + 1, k)),
                            this.bondConfig(lattice)
                        );

                    if (k + 1 < this._nz)
                        lattice.connect(
                            current,
                            lattice.bodyAt(this.index(i, j, k + 1)),
                            this.bondConfig(lattice)
                        );
                }
    }

    index(i, j, k) {
        return i + this._nx * (j + this._ny * k);
    }

    bondConfig(lattice) {
        return {
            k: lattice.k,
            damping: lattice.damping,
            radius: lattice.bondRadius,
            restLength: this._spacing
        };
    }
}
