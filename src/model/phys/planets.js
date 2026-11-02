import { RadialSymmetricBody } from './bodies.js';
import { Vec3 } from '../math/objects.js';

export class Sun extends RadialSymmetricBody {
    constructor({
                    position = new Vec3(0, 0, 0),
                    velocity = new Vec3(0, 0, 0),
                    mass = 1,
                    radius = 1
                } = {}) {
        super({ position, velocity , mass, radius });
        this.time = 0;
    }
}

export class Planet extends RadialSymmetricBody {
    constructor(planetData) {
        super({
            mass: planetData.mass,
            radius: planetData.radius
        });
        this._tilt = planetData.tilt; // Angle between planet rotation axis & line perpendicular to its orbit plane
        this._spin = planetData.spin; // Rotation speed of planet around planet axis measured in hours
        this._inclination = planetData.inclination; // Inclination of the orbit
        this._semiMajorAxis = planetData.a; // Semi major axis is half the length of the longest diameter of the ellips
        this._eccentricity = planetData.e;  // How much do we deviate from a circle (e=0), elliptic: 0 < e < 1
        this._rightAscension = planetData.right_ascension;
        this.timeStamp = 0;
    }

    get rotation() { return this.timeStamp * 0.001 * this._spin; }
    get tilt() { return this._tilt; }
    get spin() { return this._spin; }
    get inclination() { return this._inclination; }
    get semiMajorAxis() { return this._semiMajorAxis; }
    get eccentricity() { return this._eccentricity; }
    get rightAscension() { return this._rightAscension; }
}

export const Planets = {
    'mercury': new Planet({
        'name': 'mercury',
        'a': 57909050.,
        'e': 0.205630,
        'inclination': 7 * Math.PI / 180.,
        'right_ascension': 0.8436854966,
        'mean_anomaly': 3.0507657193,
        'radius': 2439.7 * 1e3,
        'mass': 3.302e+23,
        'tilt': 0.1 * Math.PI / 180.,
        'spin': 2 * Math.PI / 4222.6
    }),
    'venus': new Planet({
        'name': 'venus',
        'a': 108208000.,
        'e': 0.0067,
        'inclination': 3.39 * Math.PI / 180.,
        'right_ascension': 1.3381895772,
        'mean_anomaly': 0.8746717546,
        'radius': 6051.8 * 1e3,
        'mass': 4.8685e+23,
        'tilt': 177 * Math.PI / 180.,
        'spin':  -2 * Math.PI / 2802.
    }),
    'earth': new Planet({
        'name': 'earth',
        'a': 149598261.,
        'e': 0.01671123,
        'inclination': 0.,
        'right_ascension': 0.,
        'mean_anomaly': 6.2398515744,
        'radius': 6371010, // meters
        'mass': 5.97219e+24,
        'spin': 2 * Math.PI / 24.,
        'tilt': 23 * Math.PI / 180
    }),
    'jupiter': new Planet({
        'name': 'jupiter',
        'a': 778547200.,
        'e': 0.048775,
        'inclination': 1.31 * Math.PI / 180.,
        'right_ascension': 1.7504400393,
        'mean_anomaly': 0.3284360586,
        'radius': 71400. * 1e3,
        'mass': 1.89813e+27,
        'tilt': 3 * Math.PI / 180.,
        'spin': 2 * Math.PI / 9.93
    }),
    'saturn': new Planet({
        'name': 'saturn',
        'a': 1433449370.,
        'e': 0.055723219,
        'inclination': 2.49 * Math.PI / 180.,
        'right_ascension': 1.98,
        'mean_anomaly': 5.5911055356,
        'radius': 60000. * 1e3,
        'mass': 5.68319e+26,
        'tilt': 27 * Math.PI / 180.,
        'spin': 2 * Math.PI / 10.66
    }),
    'mars': new Planet({
        'name': 'mars',
        'a': 227939100.,
        'e': 0.093315,
        'inclination': 1.85 * Math.PI / 180.,
        'right_ascension': 0.8676591934,
        'mean_anomaly': 0.3378329113,
        'radius': 3393.5 * 1e3,
        'mass': 6.4185e+23,
        'tilt': 25 * Math.PI / 180.,
        'spin': 2 * Math.PI / 24.66
    }),
    'uranus': new Planet({
        'name': 'uranus',
        'a': 2876679082.,
        'e': 0.044405586,
        'inclination': 0.77 * Math.PI / 180.,
        'right_ascension': 1.2908891856,
        'mean_anomaly': 2.4950479462,
        'radius': 25600. * 1E3,
        'mass': 8.68103E25,
        'tilt': 98 * Math.PI / 180.,
        'spin': -2 * Math.PI / 17.24
    }),
    'neptune': new Planet({
        'name': 'neptune',
        'a': 4503443661.,
        'e': 0.011214269,
        'inclination': 1.77 * Math.PI / 180.,
        'right_ascension': 2.3001058656,
        'mean_anomaly': 4.6734206826,
        'radius': 24300. * 1E3,
        'mass': 1.024E26,
        'tilt': 30 * Math.PI / 180.,
        'spin': 2 * Math.PI / 16.11,
    })
};
