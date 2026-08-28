import { Vec3} from "../math/math.js";
import { Integrators } from "../math/numerics/integrators/integrators.js";
import { MathPhysicsModelBehavior } from "../../core/helion.js";
import {SpringForce} from "./forces.js";

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

    get axis() { return this.body1.positionVectorTo(this.body2); }
    get position() { return this.body1.position; }
    get mass() { return this.body2.mass + this.body1.mass; }
}

class Configuration {
    constructor({
        position = new Vec3(),
        orientation = new Vec3(),
        childrenPositions = [],
        childrenOrientations = []
    }={}) {
        this.position = position;
        this.orientation = orientation;
        this.childrenPositions = childrenPositions;
        this.childrenOrientations = childrenOrientations;
        Object.freeze(this);
    }
}

export class Body extends MathPhysicsModelBehavior{
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        mass = 1,
        charge = 0,
        fixed = false,
        orientation = new Vec3() // Euler angle in radians
    } = {}) {
        super();
        this._state = new PhysicsState({ position, velocity, mass, charge });
        this._force = new Vec3();
        this.fixed = fixed;
        this.orientation = orientation;
        this._initialState = this._state.clone();
        this._initialOrientation = orientation.clone();
        this._children = [];
        this.localPosition = new Vec3();
    }

    reorient(orientation) {
        this.position.copy(orientation.position);
        this.orientation.copy(orientation.orientation);
        this._children.forEach((child, index) => {
            child.position.copy(orientation.childrenPositions[index]);
            child.orientation.copy(orientation.childrenOrientations[index]);
            child.localPosition.copy(orientation.childrenPositions[index].clone().sub(this.position));
        });
    }

    getConfiguration() {
        return new Configuration({
            position: this.position.clone(),
            orientation: this.orientation.clone(),
            childrenOrientations: Array.from(this, child => child.orientation.clone()),
            childrenPositions: Array.from(this, child => child.position.clone()),
        });
    }

    rotate(axis, angle) {
        this.position.rotate(axis, angle);
        this.rotateWorld(axis, angle);
        this.rotateChildren(axis, angle);
        this._children.forEach(child =>
            child.position.copy(this.position).add(child.localPosition));
    }

    rotateChildren(axis, angle) {
        for (const child of this._children)
            child.rotateWithParent(axis, angle);
    }

    rotateWithParent(axis, angle) {
        this.localPosition.rotate(axis, angle);
        this.rotateWorld(axis, angle);
    }

    add(anotherBody) {
        this._children.push(anotherBody);
    }

    forEach(callback) {
        this._children.forEach(callback);
    }

    [Symbol.iterator]() {
        return this._children[Symbol.iterator]();
    }

    get position() { return this._state.position; }
    get velocity() { return this._state.velocity; }
    get acceleration() { return this._state.acceleration; }
    get mass() { return this._state.mass; }
    get charge() { return this._state.charge; }
    get state() { return this._state; }
    get force() { return this._force; }

    reset() {
        this._state= this._initialState.clone();
        this.orientation.copy(this._initialOrientation);
    }

    /**
     * Returns the electric field at a point, when charge unequal to zero.
     *
     * @param {Vec3} point
     * @returns {Vec3} electric field as vector.
     */
    fieldAt(point) {
        const rVec = point.clone().sub(this._state.position);
        const distanceSquared = rVec.dot(rVec);

        return distanceSquared < 1e-40 ?
            new Vec3(0, 0, 0) :
            rVec.normalize().multiplyScalar(this._state.charge / distanceSquared);
    }

    /**
     * Rotates the body around a world-space axis.
     *
     * @param {"x"|"y"|"z"} axis World-space rotation axis.
     * @param {number} angle Rotation angle in radians.
     * @returns {this}
     */
    rotateWorld(axis, angle) {
        // Euler XYZ -> Quaternion
        const c1 = Math.cos(this.orientation.x / 2);
        const c2 = Math.cos(this.orientation.y / 2);
        const c3 = Math.cos(this.orientation.z / 2);

        const s1 = Math.sin(this.orientation.x / 2);
        const s2 = Math.sin(this.orientation.y / 2);
        const s3 = Math.sin(this.orientation.z / 2);

        // These are exact de XYZ-formula van THREE.Quaternion.setFromEuler()
        const start = {
            x: s1 * c2 * c3 + c1 * s2 * s3,
            y: c1 * s2 * c3 - s1 * c2 * s3,
            z: c1 * c2 * s3 + s1 * s2 * c3,
            w: c1 * c2 * c3 - s1 * s2 * s3
        };

        // Axis-angle -> Quaternion
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        const c = Math.cos(halfAngle);

        let rotation;
        if (axis === "x")
            rotation = { x: s, y: 0, z: 0, w: c };
        else if (axis === "y")
            rotation = { x: 0, y: s, z: 0, w: c };
        else
            rotation = { x: 0, y: 0, z: s, w: c };

        // rotation.multiply(start) = rotation * start
        const q = {
            x: rotation.x * start.w + rotation.w * start.x + rotation.y * start.z - rotation.z * start.y,
            y: rotation.y * start.w + rotation.w * start.y + rotation.z * start.x - rotation.x * start.z,
            z: rotation.z * start.w + rotation.w * start.z + rotation.x * start.y - rotation.y * start.x,
            w: rotation.w * start.w - rotation.x * start.x - rotation.y * start.y - rotation.z * start.z
        };

        // Quaternion -> Euler XYZ
        //
        // This is exactly as Three.js: Quaternion -> rotation matrix -> Euler XYZ.
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const m11 = 1 - 2 * (q.y * q.y + q.z * q.z);
        const m12 = 2 * (q.x * q.y - q.z * q.w);
        const m13 = 2 * (q.x * q.z + q.y * q.w);

        const m22 = 1 - 2 * (q.x * q.x + q.z * q.z);
        const m23 = 2 * (q.y * q.z - q.x * q.w);

        const m32 = 2 * (q.y * q.z + q.x * q.w);
        const m33 = 1 - 2 * (q.x * q.x + q.y * q.y);

        this.orientation.y = Math.asin(clamp(m13, -1, 1));
        if (Math.abs(m13) < 0.9999999) {
            this.orientation.x = Math.atan2(-m23, m33);
            this.orientation.z = Math.atan2(-m12, m11);
        } else {
            // Gimbal lock: exact the same choice as Three.js
            this.orientation.x = Math.atan2(m32, m22);
            this.orientation.z = 0;
        }
    }

    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        if (this.fixed)
            return this;

        this._state.acceleration.copy(this.force.multiplyScalar(1 / this.mass));
        this._force.set(0, 0, 0); // Force has been divided by mass => thus dirty => thus clean
        integrator(this._state, dt);
        return this;
    }

    positionVectorTo(other) { return other.position.clone().sub(this.position); }
    distanceToSquared(other) { return this.position.distanceSquaredTo(other.position); }
    distanceTo(other) { return this.position.distanceTo(other.position) }

    get kineticEnergy() { return 0.5 * this.mass * this.velocity.dot(this.velocity); }
    get momentum() { return this.velocity.multiplyScalar(this.mass); }
}

export class AxialSymmetricBody extends Body {
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        axis = new Vec3(),
        radius = 1,
        mass = 1,
        charge = 0,
        fixed = false,
        orientation = new Vec3() // Euler angle in radians
    } = {})  {
        super({ position, velocity, mass, charge, fixed, orientation });
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
        fixed = false,
        orientation = new Vec3() // Euler angle in radians
    } = {}) {
        super({position, velocity, mass, charge, fixed, orientation });
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
        fixed = false,
        orientation = new Vec3() // Euler angle in radians
    } = {}) {
        super({position, velocity, mass, charge, fixed, orientation });
        this.size = size;
    }
}

export class Lattice extends MathPhysicsModelBehavior {
    constructor({
        k = 100,
        damping = 0,
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
    }

    get damping() { return this._damping; }
    get bondRadius() { return this._bondRadius; }
    get bodySize() { return this._bodySize; }
    get k () { return this._k; }

    set damping(damping) {
        this._damping = damping;
        for (const coupling of this._bondForces)
            coupling.damping = damping;
    }

    fixateBodyAt(index) {
        this._bodies[index].fixed = true;
        return this;
    }

    addBody(body) {
        this._bodies.push(body);
        return this;
    }

    connect(body1, body2, {k, restLength, damping}) {
        this._bonds.push(body1.and(body2));
        this._bondForces.push(new SpringForce({k, restLength, damping}));
    }

    set bondForce(value) { this._bondForces.forEach(bond => bond.k = value); }

    set omega(value) { this._omega = value; }

    get bodyCount() { return this._bodies.length }
    get bondCount() { return this._bonds.length }

    bodyAt(index) { return this._bodies[index]; }
    bondAt(index) { return this._bonds[index]; }

    applyToBodies(transformation) {
        for (const body of this._bodies)
            transformation.applyTo(body);

        return this;
    }

    integrate(dt) {
        for (let i = 0; i < this.bondCount; i++)
            this._bonds[i].apply(this._bondForces[i]);

        for (const body of this._bodies)
            body.integrate(dt);

        return this;
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
        bondRestLength = length / (count -1),
        totalMass = 0.025
    } = {}) {
        this._count = count;
        this._length = length;
        this._totalMass = totalMass;
        this._bondRestLength = bondRestLength;
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
                restLength: this._bondRestLength,
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
