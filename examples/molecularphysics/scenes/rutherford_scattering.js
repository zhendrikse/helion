import {
    Vec3, Simulation, Sphere, Cylinder, Trail, RadialSymmetricBody, CoulombPairForce, AxialSymmetricBody
} from "../../../src/index.js";


const Q = 1.6e-19;
const X_MAX = 1e-13;
const K0 = 10e6 * Q;
const ALPHA_MASS = 4e-3 / 6.12e23;
const GOLD_MASS  = 197e-3 / 6.02e23;
const ALPHA_CHARGE = 2 * Q;
const GOLD_CHARGE  = 79 * Q;
const GOLD_RADIUS  = 6e-15;
const ALPHA_RADIUS = 4e-15;
const SOURCE_RADIUS = 6e-14;
const SOURCE_X = -2 * X_MAX;
const MAX_DISTANCE = 1.8e-13;
const ALPHA_COLOR = 0x33ffff;

class AlphaSource extends AxialSymmetricBody {
    constructor({
        position = new Vec3(-1.5 * X_MAX - 2.5 * ALPHA_RADIUS, 0, 0),
        radius = SOURCE_RADIUS,
        axis = new Vec3(0.1 * X_MAX, 0, 0)
    } = {}) {
        super({ position, radius, axis });
        this._position = position.clone();
        this._radius = radius;
    }

    // Uniform random point inside circular source aperture
    beamPosition() {
        let y, z;
        do {
            y = (2 * Math.random() - 1) * this._radius;
            z = (2 * Math.random() - 1) * this._radius;
        } while (y * y + z * z > this._radius * this._radius);

        return new Vec3(-1.5 * X_MAX, y, z);
    }
}

const gold = new RadialSymmetricBody({
    position: new Vec3(0, 0, 0),
    mass: GOLD_MASS,
    charge: GOLD_CHARGE,
    radius: GOLD_RADIUS
});

const source = new AlphaSource();
const coulombForce = new CoulombPairForce();
let alpha = null;
let alphaTrail = null;

const departureMarkers = [];
function createAlphaParticle() {
    const position = source.beamPosition();
    const momentum = new Vec3(Math.sqrt(2 * ALPHA_MASS * K0), 0, 0);

    alpha = new RadialSymmetricBody({
        position: position.clone(),
        velocity: momentum.clone().multiplyScalar(1 / ALPHA_MASS),
        mass: ALPHA_MASS,
        charge: ALPHA_CHARGE,
        radius: ALPHA_RADIUS
    });

    alphaTrail = new Trail({
        maxPoints: 150,
        trailStep: 1,
        lineWidth: 1,
        color: ALPHA_COLOR
    });

    const departureMarker = new RadialSymmetricBody({
        position: position.clone(),
        radius: ALPHA_RADIUS
    });
    departureMarkers.push(departureMarker);

    simulation
        .bind(alpha.alwaysWith(alphaSphere))
        .bind(alpha.alwaysWith(alphaTrail))
        .bind(departureMarker.alwaysWith(new Sphere({ color: 0x33ffff }))
    );

    gold.reset();
    return alpha;
}

const alphaSphere = new Sphere({
    color: ALPHA_COLOR,
    segments: 24
});

const goldCylinder = new Cylinder({
    color: 0x999999
});

const dt = 5e-23;
const simulation = Simulation
    .with({
        htmlDivId: "rutherfordScatteringContainer",
        cameraPosition: new Vec3(0, 0, 5),
        fieldOfView: 40,
        scale: 1 / X_MAX,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .bind(source.onceWith(new Cylinder({segments: 48, color: 0x999999})))
    .bind(gold.alwaysWith(new Sphere({ color: 0xffff00, segments: 36 })))
    .runsEvery(1e-3)
    .onStep(() => {
        if (!alpha)
            createAlphaParticle();

        gold.and(alpha).apply(coulombForce);
        alpha.integrate(dt);
        gold.integrate(dt);

        if (alpha.position.length() >= MAX_DISTANCE)
            finishAlphaParticle();
    })
    .onReset(() => {
        if (alphaTrail)
            alphaTrail.reset();

        alpha = null;
        alphaTrail = null;

        gold.reset();
    });

const trails = [];
const endpointMarkers = [];
function finishAlphaParticle() {
    if (!alpha)
        return;

    const momentum = alpha.velocity.clone().multiplyScalar(ALPHA_MASS);
    const directionX = momentum.x / momentum.length();

    let alphaColor = ALPHA_COLOR;
    if (directionX <= Math.cos(Math.PI / 2)) // cos(pi/2) = 0
        alphaColor = 0xff0000;
    else if (directionX <= Math.cos(Math.PI / 4)) // cos(pi/4) = sqrt(2)/2
        alphaColor = 0x0000ff;
    alphaTrail.color = alphaColor;

    // Keep only the last three trajectories.
    if (trails.length >= 3) {
        const oldTrail = trails.shift();
        oldTrail.reset();
    }
    trails.push(alphaTrail);

    const endpointMarker = new RadialSymmetricBody({
        position: alpha.position.clone(),
        radius: ALPHA_RADIUS
    });
    endpointMarkers.push(endpointMarker);
    simulation.bind(endpointMarker.alwaysWith(new Sphere({ color: alphaColor, segments: 12 })));

    // Remove the current particle from active simulation state.
    alpha = null;
    alphaTrail = null;
}
