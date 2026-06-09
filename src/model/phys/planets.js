import {RadialSymmetricBody} from "./physics.js";

export class Planet extends RadialSymmetricBody {
    constructor(planetData) {
        super({mass: planetData.mass, radius: planetData.radius});
        this._tilt = planetData.tilt;
        this._spin = planetData.spin;
    }

    get tilt() { return this._tilt }
}

export const Planets = {
    "mercury": new Planet({
        "name": "mercury",
        'a': 57909050.,
        'e': 0.205630,
        'inclination': 7 * Math.PI / 180.,
        'right_ascension': 0.8436854966,
        'mean_anomaly': 3.0507657193,
        'radius': 2439.7 * 1e3,
        "mass": 3.302e+23,
        'tilt': 0.1 * Math.PI / 180.,
        "spin": 2 * Math.PI / 4222.6
    }),
    "earth": new Planet({

    }),
    "saturn": new Planet({
        "name": "saturn",
        'a': 1433449370.,
        'e': 0.055723219,
        'inclination': 2.49 * Math.PI / 180.,
        'right_ascension': 1.98,
        'mean_anomaly': 5.5911055356,
        'radius': 60000. * 1e3,
        "mass": 5.68319e+26,
        'tilt': 27 * Math.PI / 180.,
        'spin': 2 * Math.PI / 10.66
    })
}