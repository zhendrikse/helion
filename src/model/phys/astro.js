import {Vec3} from '../math/objects.js';
import {RadialSymmetricBody} from './bodies.js';
import {Planet} from '../../view/3d/primitives/astro.js';
import earthMap from '../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthNightMap from '../../../examples/astrophysics/textures/Solarsystemscope_texture_2k_earth_nightmap.jpg';
import {DirectionalLight, Mesh, SRGBColorSpace} from 'three';
import {Simulation} from '../../core/helion.js';
import {ThreeJsScene} from '../../view/3d/scene.js';

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

    get coordinates() { return this._points; }

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
    //     geometry.setAttribute('position', new BufferAttribute(positions, 3));
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
    get orbitCoordinates() { return this._orbit.coordinates; }
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

export const Mercury = Object.freeze({
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

export const Venus = Object.freeze({
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

export const Earth = Object.freeze({
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

export const Mars = Object.freeze({
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

export const Jupiter = Object.freeze({
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

export const Saturn = Object.freeze({
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

export const Uranus = Object.freeze({
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

export const Neptune = Object.freeze({
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

export const Luna = Object.freeze({
    'name': 'luna',
    'a': 384399,
    'e': 0.0549,
    'inclination': (-23.4 + 5.145) * Math.PI / 180.,
    'rightAscension': -Math.PI / 2.,
    'meanAnomaly': 0.,
    'radius': 1737400,
    'mass': 7.349e+22,  // kg
    'spin': 2 * Math.PI / 708.7341666667,
    'tilt': 0.11641346110802178, // rad
    'period': 27.321, // days
    'tidalLock': true
});

export const Phobos = Object.freeze({
    'name': 'phobos',
    'a': 9376,
    'e': 0.0151,
    'inclination': 0,
    'rightAscension': -Math.PI / 2,
    'meanAnomaly': 0.,
    'radius': 11.2667 * 1E4,
    'mass': 1.06E16,
    'tilt': 0.,
    'spin': 0,
    'period': 0.31891023,
    'tidalLock': true
});

export const Deimos = Object.freeze({
    'name': 'deimos',
    'a': 23463.2,
    'e': 0.00033,
    'inclination': 0,
    'rightAscension': -Math.PI / 2,
    'meanAnomaly': 0.,
    'radius': 10. * 1E4,
    'mass': 1.5E15,
    'tilt': 0.,
    'spin': 0,
    'period': 1.263,
    'tidalLock': true
});

export const Callisto = Object.freeze({
    'name': 'callisto',
    'a': 1882700,
    'e': 0.0074,
    'inclination': 0.003351032164,
    'rightAscension': 0.,
    'meanAnomaly': 0.,
    'radius': 2410.3 * 1e3,
    'mass': 1.076E23,
    'tilt': 0.,
    'spin': 0,
    'period': 16.689,
    'tidalLock': true
});

export const Europa = Object.freeze({
    'name': 'europa',
    'a': 670900,
    'e': 0.009,
    'inclination': 0.008203047484,
    'rightAscension': 0.,
    'meanAnomaly': 0.,
    'radius': 1560.8 * 1e3,
    'mass': 4.8E22,
    'tilt': 0.,
    'spin': 0,
    'period': 12.689,
    'tidalLock': true
});

export const Ganymede = Object.freeze({
    'name': 'ganymede',
    'a': 1070400,
    'e': 0.0013,
    'inclination': 0.003490658504,
    'rightAscension': 0.,
    'meanAnomaly': 0.,
    'radius': 2634.1 * 1E3,
    'mass': 1.4819E23,
    'tilt': 0.,
    'spin': 0,
    'period': 10.689,
    'tidalLock': true
});

export const Io = Object.freeze({
    'name': 'io',
    'a': 421800,
    'e': 0.0041,
    'inclination': 0.03857177647,
    'rightAscension': 0.,
    'meanAnomaly': 0.,
    'radius': 1821.6 * 1E3,
    'mass': 8.9319E22,
    'tilt': 0.,
    'spin': 0,
    'period': 6.689,
    'tidalLock': true
});
    /*
    'dione': new Moon({
        'name': 'dione',
        'a': 377396 * 3 * SCALE_MOON,
        'e': 0.0022,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 561.4 * 3 * 1e3,
        'mass': 1.095E21,
        'tilt': 0.,
        'spin': 0,
        'period': 7.689,
        'tidal_lock': 1
    }, Bodies.saturn),
    'enceladus': new Moon({
        'name': 'enceladus',
        'a': 237948 * 3 * SCALE_MOON,
        'e': 0.0047,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 252.1 * 3 * 1e3,
        'mass': 1.08022E20,
        'tilt': 0.,
        'spin': 0,
        'period': 16.689,
        'tidal_lock': 1
    }, Bodies.saturn),
    'tethys':  new Moon({
        'name': 'tethys',
        'a': 294619 * 3 * SCALE_MOON,
        'e': 0.,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 531.1 * 3 * 1e3,
        'mass': 6.17E20,
        'tilt': 0.,
        'spin': 0,
        'period': 1.689,
        'tidal_lock': 1
    }, Bodies.saturn),
    'titan': new Moon({
        'name': 'titan',
        'a': 1221870 * SCALE_MOON,
        'e': 0.0288,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 2576. * 1E3,
        'mass': 1.345E23,
        'tilt': 0.,
        'spin': 0,
        'period': 61.689,
        'tidal_lock': 1
    }, Bodies.saturn),
    'ariel': new Moon({
        'name': 'ariel',
        'a': 191020 * SCALE_MOON,
        'e': 0.0012,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 578.9 * 1E3,
        'mass': 1.353 * 1e21,
        'tilt': 0.,
        'spin': 0,
        'period': 16.689,
        'tidal_lock': 1
    }, Bodies.uranus),
    'oberon': new Moon({
        'name': 'oberon',
        'a': 583520 * SCALE_MOON,
        'e': 0.0014,
        'inclination': 0.,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 761.4 * 1E3,
        'mass': 3.014 * 1e21,
        'tilt': 0.,
        'spin': 0,
        'period': 6.689,
        'tidal_lock': 1
    }, Bodies.uranus),
    'titania': new Moon({
        'name': 'titania',
        'a': 435910 * SCALE_MOON,
        'e': 0.0011,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 788.4 * 1E3,
        'mass': 3.4 * 1e21,
        'tilt': 0.,
        'spin': 0,
        'period': 1.689,
        'tidal_lock': 1
    }, Bodies.uranus),
    'umbriel': new Moon({
        'name': 'umbriel',
        'a': 266000 * SCALE_MOON,
        'e': 0.0039,
        'inclination': 0,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 584.7 * 1E3,
        'mass': 1.275 * 1e21,
        'tilt': 0.,
        'spin': 0,
        'period': 24.689,
        'tidal_lock': 1
    }, Bodies.uranus),
    'triton': new Moon({
        'name': 'triton',
        'a': 354759 * SCALE_MOON,
        'e': 0.,
        'inclination': 0.,
        'right_ascension': -Math.PI / 2.,
        'mean_anomaly': 0.,
        'radius': 1353.4 * 1E3,
        'mass': 2.1390 * 1e22,
        'tilt': 0.,
        'spin': 0,
        'period': 16.689,
        'tidal_lock': 1
    }, Bodies.neptune)
}
*/
