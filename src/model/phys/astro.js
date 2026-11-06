import {Vec3} from "../math/objects.js";
import {RadialSymmetricBody} from "./bodies.js";
import {Planet} from "../../view/3d/primitives/astro.js";
import earthMap from "../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_daymap.jpg";
import earthNightMap from "../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_nightmap.jpg";
import {DirectionalLight, Mesh, SRGBColorSpace} from "three";
import {Simulation} from "../../core/helion.js";
import {ThreeJsScene} from "../../view/3d/scene.js";

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
        this._time = 0;
        this._orbit = new Orbit(
            365.25 * (a / CelestialBody.EARTH_SEMI_MAJOR_AXIS) ** 1.5, // rotation period w.r.t. Earth
            meanAnomaly,
            e,
            a,
            inclination,
            rightAscension
        );
    }

    set time(newTime) {
        this._time = newTime;
        this.position.copy(this.coordinates);
    }

    get time() { return this._time; }
    get coordinates() { return this._orbit.coordinatesAt(this._time); }
    get meanAnomaly() { return this._meanAnomaly; }
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
        this._planet = planet;
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

    get planet() { return this._planet; }
    get lock() { return this._lock; }

    update() {
        if (this._lock) {
            this.lookAt(this._planet.position);
            // Correct fixed phase fase-offset if needed (texture-orientation)
            this.rotateY(Math.PI); // or rotateZ, dependent on texture
        }
    }
}

export class PlanetMoonSystem {
    constructor(planet, moons = [], distanceScaleFactor = 75) {
        this._planet = planet;
        this._moons = moons;
        this._distanceScaleFactor = distanceScaleFactor;
        this._baryPosition = new Vec3();
    }

    get mass() {
        let M = this._planet.mass;
        for (const moon of this._moons)
            M += moon.mass;
        return M;
    }

    get planet() { return this._planet; }

    update() {
        // 1. barycentric position (sun-centric)
        this._baryPosition.copy(this._planet.coordinates);

        // 2. total mass
        const M = this.mass;

        // 3. barycentric correction
        const correction = new Vec3();
        for (const moon of this._moons)
            correction.add(moon.coordinates.clone().multiplyScalar(moon.mass / M));

        // 4. planet position
        this._planet.position.copy(this._baryPosition.clone().sub(correction));

        // 5. moon positions
        for (const moon of this._moons)
            moon.position.copy(this._baryPosition
                .clone()
                .add(moon.coordinates.clone().multiplyScalar(this._distanceScaleFactor)));
    }
}

export const Mercury = new CelestialBody({
    name: 'mercury',
    a: 57909050.,
    e: 0.205630,
    inclination: 7 * Math.PI / 180.,
    rightAscension: 0.8436854966,
    meanAnomaly: 3.0507657193,
    radius: 2439.7 * 1e3,
    mass: 3.302e+23,
    tilt: 0.1 * Math.PI / 180.,
    spin: 2 * Math.PI / 4222.6
});

export const Venus = new CelestialBody({
    name: 'venus',
    a: 108208000.,
    e: 0.0067,
    inclination: 3.39 * Math.PI / 180.,
    rightAscension: 1.3381895772,
    meanAnomaly: 0.8746717546,
    radius: 6051.8 * 1e3,
    mass: 4.8685e+23,
    tilt: 177 * Math.PI / 180.,
    spin:  -2 * Math.PI / 2802.
});

export const Earth = new CelestialBody({
    name: 'earth',
    a: 149598261.,
    e: 0.01671123,
    inclination: 0.,
    rightAscension: 0.,
    meanAnomaly: 6.2398515744,
    radius: 6371010, // meters
    mass: 5.97219e+24,
    spin: 2 * Math.PI / 24.,
    tilt: 23 * Math.PI / 180
});

export const Luna = new Moon(Earth, {
    "name": "luna",
    "a": 384399,
    "e": 0.0549,
    "inclination": (-23.4 + 5.145) * Math.PI / 180.,
    "rightAscension": -Math.PI / 2.,
    "meanAnomaly": 0.,
    "radius": 1737400,
    "mass": 7.349e+22,  // kg
    "spin": 2 * Math.PI / 708.7341666667,
    "tilt": 0.11641346110802178, // rad
    'period': 27.321, // days
    "tidalLock": true
});

export const Mars = new CelestialBody({
    name: 'mars',
    a: 227939100.,
    e: 0.093315,
    inclination: 1.85 * Math.PI / 180.,
    rightAscension: 0.8676591934,
    meanAnomaly: 0.3378329113,
    radius: 3393.5 * 1e3,
    mass: 6.4185e+23,
    tilt: 25 * Math.PI / 180.,
    spin: 2 * Math.PI / 24.66
});

export const Jupiter = new CelestialBody({
    name: 'jupiter',
    a: 778547200.,
    e: 0.048775,
    inclination: 1.31 * Math.PI / 180.,
    rightAscension: 1.7504400393,
    meanAnomaly: 0.3284360586,
    radius: 71400. * 1e3,
    mass: 1.89813e+27,
    tilt: 3 * Math.PI / 180.,
    spin: 2 * Math.PI / 9.93
});

export const Saturn = new CelestialBody({
    name: 'saturn',
    a: 1433449370.,
    e: 0.055723219,
    inclination: 2.49 * Math.PI / 180.,
    rightAscension: 1.98,
    meanAnomaly: 5.5911055356,
    radius: 60000. * 1e3,
    mass: 5.68319e+26,
    tilt: 27 * Math.PI / 180.,
    spin: 2 * Math.PI / 10.66
});

export const Uranus = new CelestialBody({
    name: 'uranus',
    a: 2876679082.,
    e: 0.044405586,
    inclination: 0.77 * Math.PI / 180.,
    rightAscension: 1.2908891856,
    meanAnomaly: 2.4950479462,
    radius: 25600. * 1E3,
    mass: 8.68103E25,
    tilt: 98 * Math.PI / 180.,
    spin: -2 * Math.PI / 17.24
});

export const Neptune = new CelestialBody({
    name: 'neptune',
    a: 4503443661.,
    e: 0.011214269,
    inclination: 1.77 * Math.PI / 180.,
    rightAscension: 2.3001058656,
    meanAnomaly: 4.6734206826,
    radius: 24300. * 1E3,
    mass: 1.024E26,
    tilt: 30 * Math.PI / 180.,
    spin: 2 * Math.PI / 16.11,
});

