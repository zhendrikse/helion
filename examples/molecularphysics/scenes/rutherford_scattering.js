import {
    Vec3, Simulation, Sphere, Cylinder, Trail, RadialSymmetricBody, CoulombPairForce, AxialSymmetricBody, EC
} from "../../../src/index.js";

const X_MAX = 1e-13;
const ALPHA_ENERGY  = 10e6 * EC;
const ALPHA_MASS = 4e-3 / 6.12e23;
const GOLD_MASS  = 197e-3 / 6.02e23;
const ALPHA_CHARGE = 2 * EC;
const GOLD_CHARGE  = 79 * EC;
const GOLD_RADIUS  = 6e-15;
const ALPHA_RADIUS = 4e-15;
const SOURCE_RADIUS = 6e-14;
const MAX_DISTANCE = 1.8e-13;
const ALPHA_COLOR = 0x33ffff;

class AlphaSource extends AxialSymmetricBody {
    constructor({
        position = new Vec3(-1.5 * X_MAX - 1.75 * ALPHA_RADIUS, 0, 0),
        radius = SOURCE_RADIUS,
        axis = new Vec3(7.5e-2 * X_MAX, 0, 0)
    } = {}) {
        super({ position, radius, axis });
    }

    // Uniform random point inside circular source aperture
    beamPosition() {
        let y, z;
        do {
            y = (2 * Math.random() - 1) * this.radius;
            z = (2 * Math.random() - 1) * this.radius;
        } while (y * y + z * z > this.radius * this.radius);

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
    const momentum = new Vec3(Math.sqrt(2 * ALPHA_MASS * ALPHA_ENERGY ), 0, 0);

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

    const departureMarker = new Sphere({ color: 0x33ffff });
    departureMarkers.push(departureMarker);
    simulation
        .bind(alpha.alwaysWith(alphaSphere))
        .bind(alpha.alwaysWith(alphaTrail))
        .bind(new RadialSymmetricBody({
            position: position.clone(),
            radius: ALPHA_RADIUS
        }).alwaysWith(departureMarker)
    );

    gold.reset();
    return alpha;
}

// Only one alpha particle is active at a time, so this view can be reused.
const alphaSphere = new Sphere({ color: ALPHA_COLOR, segments: 24 });
const simulation = Simulation
    .with({
        htmlDivId: "rutherfordScatteringContainer",
        camera: {
            position: new Vec3(0, 0, 5.25),
            fieldOfView: 40
        },
        scene: {
            scale: 1 / X_MAX
        }
    })
    .withMouseClickEventListener()
    .bind(source.onceWith(new Cylinder({segments: 48, color: 0x999999})))
    .bind(gold.alwaysWith(new Sphere({ color: 0xffff00, segments: 36 })))
    .maxOutCpu(() => {
        if (!alpha)
            createAlphaParticle();

        gold.and(alpha).apply(coulombForce);
        alpha.integrate(2.5e-23);
        gold.integrate(2.5e-23);

        if (alpha.position.length() >= MAX_DISTANCE)
            finishAlphaParticle();
    }, 30, 60)
    .onReset(() => {
        if (alphaTrail)
            alphaTrail.reset();

        trails.forEach(trail => trail.reset());
        trails.length = 0;

        alpha = null;
        alphaTrail = null;
        gold.reset();

        endpointMarkers.forEach(marker => marker.visible = false);
        departureMarkers.forEach(marker => marker.visible = false);
        endpointMarkers.length = 0;
        departureMarkers.length = 0;
    });

const trails = [];
const endpointMarkers = [];
function finishAlphaParticle() {
    if (!alpha)
        return;

    const momentum = alpha.velocity.clone().multiplyScalar(ALPHA_MASS);
    const directionX = momentum.x / momentum.length();

    let alphaColor = ALPHA_COLOR;
    if (directionX <= 0) // cos(pi/2) = 0
        alphaColor = 0xff0000;
    else if (directionX <= Math.SQRT1_2)
        alphaColor = 0x0000ff;
    alphaTrail.color = alphaColor;

    // Keep only the last three trajectories.
    if (trails.length >= 3) {
        const oldTrail = trails.shift();
        oldTrail.reset();
    }
    trails.push(alphaTrail);

    const endpointMarker = new Sphere({ color: alphaColor, segments: 12 });
    endpointMarkers.push(endpointMarker);
    simulation.bind(new RadialSymmetricBody({
        position: alpha.position.clone(),
        radius: ALPHA_RADIUS
    }).alwaysWith(endpointMarker));

    // Remove the current particle from active simulation state.
    alpha = null;
    alphaTrail = null;
}
