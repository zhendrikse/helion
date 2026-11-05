import { Vec3, Vec2 } from '../math/objects.js';
import { Integrators } from '../math/numerics/integrators/integrators.js';
import { ModelObject, Transformation } from '../behavior.js';
import { SpringForce} from './forces.js';
import {Planet} from "../../view/3d/primitives/astro.js";
import earthMap from "../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_daymap.jpg";
import earthNightMap from "../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_nightmap.jpg";
import {Mesh, SRGBColorSpace} from "three";

export class PhysicsState {
    /**
     * @param {{
     *    position?: Vec3 | Vec2,
     *    velocity?: Vec3 | Vec2,
     *    acceleration?: Vec3 | Vec2,
     *    mass?: number,
     *    charge?: number
     *  }} options
     */
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
// Bodies to do physics with
//

export class BodyPairs extends ModelObject {
    /**
     * @param {BodyPair} bodyPair1 
     * @param {BodyPair} bodyPair2 
     */
    constructor(bodyPair1, bodyPair2) {
        super();
        this.bodyPair1 = bodyPair1;
        this.bodyPair2 = bodyPair2;
    }
    
    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        this.bodyPair1.integrate(dt, integrator);
        this.bodyPair2.integrate(dt, integrator);
    }

    reset() {
        this.bodyPair1.reset?.();
        this.bodyPair2.reset?.();
    }
}

export class BodyPair extends ModelObject {
    /**
     * @param {Body} body1 
     * @param {Body} body2 
     */
    constructor(body1, body2) {
        super();
        this.body1 = body1;
        this.body2 = body2;
    }

    /** @param {BodyPair} otherBodyPair */
    and(otherBodyPair) { 
        return new BodyPairs(this, otherBodyPair);
    };

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
    /**
     * @param {{
     *     position?: Vec3,
     *     orientation?: Vec3,
     *     childrenPositions?: Vec2[] | Vec3[],
     *     childrenOrientations?: Vec2[] | Vec3[]
     }} options
     */
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

export class Body extends ModelObject{
    /**
     * @param {{
     *  position?: Vec3 | Vec2
     *  velocity?: Vec3 | Vec2
     *  acceleration?: Vec3 | Vec2
     *  mass?: number
     *  fixed?: boolean
     *  charge?: number
     *  orientation?: Vec3
     * }} [options]
     */
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
        /** @type Body[] */
        this._children = [];
        this.localPosition = new Vec3();
    }

    /** @param {Body} otherBody */
    and(otherBody) { 
        return new BodyPair(this, otherBody);
    };

    /** @param {Configuration} configuration */
    reorient(configuration) {
        this.position.copy(configuration.position);
        this.orientation.copy(configuration.orientation);
        this._children.forEach((child, index) => {
            child.position.copy(configuration.childrenPositions[index]);
            child.orientation.copy(configuration.childrenOrientations[index]);
            child.localPosition.copy(configuration.childrenPositions[index].clone().sub(this.position));
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

    /**
     * @param {Vec3}  axis
     * @param {number} angle
     */
    rotate(axis, angle) {
        this.position.rotateEuler(axis, angle);
        this.rotateWorld(axis, angle);
        this.rotateChildren(axis, angle);

        this._children.forEach(child =>
            child.position.copy(this.position).add(child.localPosition));
    }

    /**
     * @param {Vec3}  axis
     * @param {number} angle
     */
    rotateEuler(axis, angle) {
        this.position.rotateEuler(axis, angle);
    }

    /**
     * @param {Vec3}  axis
     * @param {number} angle
     */
    rotateChildren(axis, angle) {
        for (const child of this._children)
            child.rotateWithParent(axis, angle);
    }

    /**
     * @param {Vec3} axis
     * @param {number} angle
     */
    rotateWithParent(axis, angle) {
        this.localPosition.rotateEuler(axis, angle);
        this.rotateWorld(axis, angle);
    }

    /** @param {Body} anotherBody */
    add(anotherBody) {
        this._children.push(anotherBody);
    }

    /**
     * @param {(value: Body, index: number, array: Body[]) => void} callback
     */
    forEach(callback) {
        this._children.forEach(callback);
    }

    /** @returns {ArrayIterator<Body>} */
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
    get speed() { return this.velocity.length(); }

    reset() {
        this._state= this._initialState.clone();
        this.orientation.copy(this._initialOrientation);
    }

    /**
     * Returns the electric field at a point, when charge unequal to zero.
     *
     * @param {Vec3 | Vec2} point
     * @returns {Vec3 | Vec2 } electric field as vector.
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
     * @param {Vec3} axis World-space rotation axis.
     * @param {number} angle Rotation angle in radians.
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
        if (axis === Vec3.X_UNIT_VECTOR)
            rotation = { x: s, y: 0, z: 0, w: c };
        else if (axis === Vec3.Y_UNIT_VECTOR)
            rotation = { x: 0, y: s, z: 0, w: c };
        else if (axis === Vec3.Z_UNIT_VECTOR)
            rotation = { x: 0, y: 0, z: s, w: c };
        else
            throw new Error("World rotations are only supported around X, Y, or Z-axes");

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
        const clamp = (
            /** @type {number} */ value, /** @type {number} */ min, /** @type {number} */ 
            max) => Math.max(min, Math.min(max, value)
        );

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

    /**
     * Perform an integration step.
     * @param {number} dt
     * @param {(physicsState: PhysicsState, dt: number) => void} integrator
     * @returns {Body}
     */
    integrate(dt = 0.01, integrator = Integrators.symplecticEulerStep) {
        if (this.fixed)
            return this;

        this._state.acceleration.copy(this._force.multiplyScalar(1 / this.mass));
        integrator(this._state, dt);
        this._force.set(0, 0, 0); // Force has been divided by mass => thus dirty => thus clean
        return this;
    }

    /** @param {Body} other */
    positionVectorTo(other) { return other.position.clone().sub(this.position); }
    /** @param {Body} other */
    distanceToSquared(other) { return this.position.distanceSquaredTo(other.position); }
    /** @param {Body} other */
    distanceTo(other) { return this.position.distanceTo(other.position); }

    get kineticEnergy() { return 0.5 * this.mass * this.velocity.dot(this.velocity); }
    get momentum() { return this.velocity.clone().multiplyScalar(this.mass); }
}

export class AxialSymmetricBody extends Body {
    /**
     * @param {{
     *  position?: Vec3
     *  velocity?: Vec3
     *  axis?: Vec3
     *  mass?: number
     *  radius?: number
     *  fixed?: boolean
     *  charge?: number
     *  orientation?: Vec3
     * }} [options]
     */
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
    /**
     * @param {{
     *  position?: Vec3
     *  velocity?: Vec3
     *  mass?: number
     *  radius?: number
     *  fixed?: boolean
     *  charge?: number
     *  orientation?: Vec3
     * }} [options]
     */
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
    /**
     * @param {{
     *  position?: Vec3 | Vec2
     *  velocity?: Vec3 | Vec2
     *  size?: Vec3 | Vec2
     *  mass?: number
     *  fixed?: boolean
     *  charge?: number
     *  orientation?: Vec3
     * }} [options]
     */
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

class Orbit {
    constructor(timescale, meanAnomaly, eccentricity, semiMajorAxis, inclination, ascension, accuracy = 1E2, nPoints = 10000) {
        this._nPoints = nPoints; // number of orbit coordinates generated
        this._timescale = timescale;
        const range = this._linSpace(meanAnomaly, 2 * Math.PI + meanAnomaly, nPoints);

        let eccentricAnomaly = range.slice();
        let eccentricAnomalyOld = new Array(nPoints);

        let maxDiff = Infinity;
        while (maxDiff > accuracy) {
            maxDiff = 0;
            eccentricAnomalyOld = eccentricAnomaly.slice(); // copy array

            // Newton–Raphson step
            for (let i = 0; i < nPoints; i++) {
                const f = eccentricAnomalyOld[i] - eccentricity * Math.sin(eccentricAnomalyOld[i]) - range[i];
                const fPrime = 1 - eccentricity * Math.cos(eccentricAnomalyOld[i]);
                eccentricAnomaly[i] = eccentricAnomalyOld[i] - f / fPrime;
                maxDiff = Math.max(maxDiff, Math.abs(eccentricAnomaly[i] - eccentricAnomalyOld[i]));
            }
        }

        this._points = [];
        for (let i = 0; i < nPoints; i++) {
            const theta = 2 * Math.atan2(
                Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly[i] / 2),
                Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly[i] / 2)
            );

            const r = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly[i]));
            const thetaAsc = theta - ascension;

            const x = (Math.cos(ascension) * Math.cos(thetaAsc) -
                Math.sin(ascension) *
                Math.sin(thetaAsc) *
                Math.cos(inclination));

            const z = (Math.sin(ascension) * Math.cos(thetaAsc) +
                Math.cos(ascension) *
                Math.sin(thetaAsc) *
                Math.cos(inclination));

            const y = Math.sin(theta - ascension) * Math.sin(inclination);
            this._points.push(new Vec3(x, y, z).multiplyScalar(r));
        }
    }

    _linSpace(start, stop, num) {
        const result = [];
        const step = (stop - start) / (num - 1);

        for (let i = 0; i < num - 1; i++)
            result.push(start + i * step);

        result.push(stop); // include last point as well
        return result;
    }

    _indexAtTime(tHours) {
        const periodHours = this._timescale * 24;
        const phase = (tHours % periodHours) / periodHours;
        return Math.floor(phase * this._nPoints);
    }

    coordinatesAt(tHours) {
        return this._points[this._indexAtTime(tHours)];
    }

    // draw({
    //          color = 0x666666,
    //          linewidth = 1,
    //          opacity = 0.9,
    //          closed = true,
    //          scale = 1,
    //          dashed = false
    //      } = {}) {
    //     const positions = new Float32Array(this._points.length * 3);
    //
    //     this._points.forEach((p, i) => {
    //         positions[3 * i + 0] = p.x * scale;
    //         positions[3 * i + 1] = p.y * scale;
    //         positions[3 * i + 2] = p.z * scale;
    //     });
    //
    //     const geometry = new BufferGeometry();
    //     geometry.setAttribute("position", new BufferAttribute(positions, 3));
    //
    //     let material;
    //     if (dashed)
    //         material = new LineDashedMaterial({ color, linewidth, dashSize: 3, gapSize: 2, transparent: true, opacity });
    //     else
    //         material = new LineBasicMaterial({ color, linewidth, transparent: true, opacity });
    //
    //     const line = closed
    //         ? new LineLoop(geometry, material)
    //         : new Line(geometry, material);
    //
    //     if (dashed) line.computeLineDistances();
    //
    //     this._line = line;
    //     return line;
    // }
}

export class CelestialBody extends RadialSymmetricBody {
    static EARTH_SEMI_MAJOR_AXIS = 149598261.;

    /**
     * @param param0
     * @param param0.position {Vec3} Position of celestial body.
     * @param param0.velocity {Vec3} Velocity of celestial body.
     * @param param0.name {string} Name of celestial body.
     * @param param0.a {number} Semi major axis is half the length of the longest diameter of the ellips.
     * @param param0.e {number} Eccentricity measures much do we deviate from a circle (e=0), elliptic: 0 < e < 1.
     * @param param0.inclination {number} The angle between the orbital and equatorial planes.
     * @param param0.rightAscension {number} Angle of a body crossing the reference/equatorial plane (bottom => up).
     * @param param0.meanAnomaly {number}
     * @param param0.radius {number} Radius of celestial body.
     * @param param0.mass {number} Mass of celestial body.
     * @param param0.spin {number} Rotation speed of planet around planet axis measured in hours.
     * @param param0.tilt {number} Angle between planet rotation axis & line perpendicular to its orbit plane.
     */
    constructor({
        position = new Vec3(),
        velocity = new Vec3(),
        name = 'Undefined',
        a = 1,
        e = 0,
        inclination = 0.,
        rightAscension = 0.,
        meanAnomaly = 0.,
        radius = 1,
        mass = 1,
        spin = 0,
        tilt = 0
    } = {}) {
        super({ position, velocity, mass, radius });
        this._tilt = tilt; //
        this._spin = spin; //
        this._inclination = inclination; //
        this._semiMajorAxis = a; //
        this._eccentricity = e;  //
        this._rightAscension = rightAscension;
        this._meanAnomaly = meanAnomaly;
        this.time = 0;
        this._orbit = new Orbit(
            365.25 * (a / CelestialBody.EARTH_SEMI_MAJOR_AXIS) ** 1.5, // rotation period w.r.t. Earth
            meanAnomaly,
            e,
            a,
            inclination,
            rightAscension
        );
    }

    coordinatesAt(t) { return this._orbit.coordinatesAt(t); }

    get meanAnomaly() { return this._meanAnomaly; }
    get rotation() { return this.time * this._spin; }
    get tilt() { return this._tilt; }
    get spin() { return this._spin; }
    get inclination() { return this._inclination; }
    get semiMajorAxis() { return this._semiMajorAxis; }
    get eccentricity() { return this._eccentricity; }
    get rightAscension() { return this._rightAscension; }
}

export class Moon extends CelestialBody {
    constructor(planet, moonData) {
        super(moonData);
        this._planet = moonData.planet;
        this._lock = moonData.tidalLock;
        this._orbit = new Orbit(
            moonData.period,
            moonData.meanAnomaly,
            this.eccentricity,
            this.semiMajorAxis,
            planet.tilt + moonData.inclination,
            moonData.rightAscension
        );
    }

    update() {
        if (this._lock) {
            this.lookAt(this._planet.position);
            // Correct fixed phase fase-offset if needed (texture-orientation)
            this.rotateY(Math.PI); // or rotateZ, dependent on texture
        }
    }
}

export const AU = 1.496 * 1E11;   // astronomical unit
export const ORBIT_SCALE = 40;    // additional orbit compression factor for nice visual representation
export const DISTANCE_SCALE = AU / ORBIT_SCALE;
const toRenderUnits = (vector) => vector.clone().multiplyScalar(1000 / DISTANCE_SCALE);

export class PlanetMoonSystem {
    constructor(planet, moons = []) {
        this._planet = planet;
        this._moons = moons;
    }

    get mass() {
        let M = this._planet.mass;
        for (const moon of this._moons)
            M += moon.mass;
        return M;
    }

    update(tHours) {
        // 1. barycentric position (sun-centric)
        const baryPosition = this._planet.coordinatesAt(tHours).clone();

        // 2. total mass
        const M = this.mass;

        // 3. barycentric correction
        const correction = new Vec3();
        for (const moon of this._moons)
            correction.add(moon.coordinatesAt(tHours).clone().multiplyScalar(moon.mass / M));

        // 4. planet position
        this._planet.position.copy(toRenderUnits(baryPosition.clone().sub(correction)));

        // 5. moon positions
        for (const moon of this._moons)
            moon.position.copy(toRenderUnits(baryPosition.clone().add(moon.coordinatesAt(tHours))));

        // 6. rotations
        this._planet.time = tHours;
        for (const moon of this._moons)
            moon.time = tHours;
    }
}

export class Lattice extends ModelObject {
    /**
     * @param {{
     * k?: number,
     * damping?: number,
     * bodySize?: number,
     * bondRadius?: number
     * }} options 
     */
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
        /** @type {Body[]} */
        this._bodies = [];
        /** @type {BodyPair[]} */
        this._bonds = [];
        /** @type {SpringForce[]} */
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

    /** @param {number} index */
    fixateBodyAt(index) {
        this._bodies[index].fixed = true;
        return this;
    }

    /** @param {Body} body */
    addBody(body) {
        this._bodies.push(body);
        return this;
    }

    /**
     * @param {Body} body1 
     * @param {Body} body2 
     * @param {{
     * k?: number,
     * damping?: number,
     * restLength?: number,
     * }} options 
     */
    connect(body1, body2, {k, restLength, damping}) {
        this._bonds.push(body1.and(body2));
        this._bondForces.push(new SpringForce({k, restLength, damping}));
    }

    /** @param {number} value */
    set bondForce(value) { this._bondForces.forEach(bond => bond.k = value); }

    /** @param {number} value */
    set omega(value) { this._omega = value; }

    get bodyCount() { return this._bodies.length; }
    get bondCount() { return this._bonds.length; }

    /** @param {number} index */
    bodyAt(index) { return this._bodies[index]; }
    /** @param {number} index */
    bondAt(index) { return this._bonds[index]; }

    /** @param {Transformation} transformation */
    applyToBodies(transformation) {
        for (const body of this._bodies)
            transformation.applyTo(body);

        return this;
    }

    /** @param {number} dt */
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

export class ChainTopology extends Transformation {
    /**
     * @param {{
     * count?: number, 
     * length?: number,
     * bondRestLength?: number,
     * totalMass?: number
     * }} options 
     */
    constructor({
        count = 100,
        length = 20,
        bondRestLength = length / (count -1),
        totalMass = 0.025
    } = {}) {
        super();
        this._count = count;
        this._length = length;
        this._totalMass = totalMass;
        this._bondRestLength = bondRestLength;
    }

    /** @param {Lattice} lattice */
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
    /**
     * @param {{
     *  nx?: number
     *  ny?: number
     *  nz?: number
     *  spacing?: number
     *  totalMass?: number
     * }} [options]
     */
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

    /** @param {Lattice} lattice  */
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

    /** 
     * @param {number} i 
     * @param {number} j 
     * @param {number} k 
     */
    isSurface(i, j, k) { 
        return i === 0 || i === this._nx - 1 ||
                j === 0 || j === this._ny - 1 ||
                k === 0 || k === this._nz - 1;
    }

    /** 
     * @param {number} i 
     * @param {number} j 
     * @param {number} k 
     */
    index(i, j, k) {
        return i + this._nx * (j + this._ny * k);
    }

    /** @param {Lattice} lattice */
    bondConfig(lattice) {
        return {
            k: lattice.k,
            damping: lattice.damping,
            radius: lattice.bondRadius,
            restLength: this._spacing
        };
    }
}
