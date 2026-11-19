import {
    Colour, PointCloud, PointCloudView, Range, Simulation, Slider,
    ThreeJsScene, Vec3, sampleNormalDistribution
} from '../../../src/index.js';

const G = 6.673e-11;
const SOLAR_MASS = 2.0e30;
const MIN_SOLAR_MASS = 0.5 * SOLAR_MASS;
const MAX_SOLAR_MASS = 250 * SOLAR_MASS;
const AVERAGE_SOLAR_MASS = 3 * SOLAR_MASS;

const DISTANCE_SCALE = 1e20;
const MAX_ORBITAL_RADIUS = 10 * DISTANCE_SCALE;
const MIN_ORBITAL_RADIUS = 0.15 * DISTANCE_SCALE;
const MILKY_WAY_THICKNESS = 0.9 * DISTANCE_SCALE;
const ANDROMEDA_THICKNESS = 0.2 * DISTANCE_SCALE;

const MILKY_WAY_STARS = 1400;
const ANDROMEDA_STARS = 2800;
const STAR_RADIUS = 0.025;
const DELTA_T = 1e17;

const clamp = (value, lower, upper) => Math.max(lower, Math.min(value, upper));

/**
 * Add the gravitational acceleration of another galaxy to a velocity.
 * Distances are kept in SI units; only the rendered positions are scaled.
 *
 * @param {Vec3} velocity
 * @param {Vec3} position
 * @param {Galaxy} galaxy
 * @param {number} dt
 */
function addGravity(velocity, position, galaxy, dt) {
    const dx = galaxy.position.x - position.x;
    const dy = galaxy.position.y - position.y;
    const dz = galaxy.position.z - position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0)
        return;

    const limitedDistance = Math.max(distance, MIN_ORBITAL_RADIUS);
    const acceleration = G * galaxy.mass / (limitedDistance * limitedDistance * distance);
    velocity.x += dx * acceleration * dt;
    velocity.y += dy * acceleration * dt;
    velocity.z += dz * acceleration * dt;
}

class Galaxy extends PointCloud {
    /**
     * @param {{
     *     starCount: number,
     *     position: Vec3,
     *     velocity: Vec3,
     *     radius: number,
     *     thickness: number,
     *     color: Colour
     * }} options
     */
    constructor({ starCount, position, velocity, radius, thickness, color }) {
        super();
        this.position = position;
        this.velocity = velocity;
        this.mass = 0;

        const masses = [];
        for (let i = 0; i < starCount; i++) {
            masses.push(clamp(
                sampleNormalDistribution(AVERAGE_SOLAR_MASS, AVERAGE_SOLAR_MASS / 3),
                MIN_SOLAR_MASS,
                MAX_SOLAR_MASS
            ));
        }

        this.mass = masses.reduce((total, mass) => total + mass, 0);
        this._masses = masses;

        const sigmaX = radius * 0.1;
        const sigmaY = thickness * 0.1;
        const sigmaZ = radius * 0.1;
        const up = new Vec3(0, 1, 0);

        for (let i = 0; i < starCount; i++) {
            const relativePosition = new Vec3(
                clamp(sampleNormalDistribution(0, sigmaX), -radius, radius),
                clamp(sampleNormalDistribution(0, sigmaY), -thickness, thickness),
                clamp(sampleNormalDistribution(0, sigmaZ), -radius, radius)
            );

            // Avoid unrealistically large orbital speeds close to the galactic centre.
            if (relativePosition.length() < MIN_ORBITAL_RADIUS)
                relativePosition.setLength(MIN_ORBITAL_RADIUS);

            const orbitalVelocity = relativePosition.clone().cross(up);
            if (orbitalVelocity.lengthSq() === 0)
                orbitalVelocity.set(1, 0, 0);
            else
                orbitalVelocity.normalize();

            orbitalVelocity.multiplyScalar(Math.sqrt(G * this.mass / relativePosition.length()));
            orbitalVelocity.add(velocity);

            this._positions.push(relativePosition.add(position));
            this._velocities.push(orbitalVelocity);
            this._colors.push(color);
            this._sizes.push(STAR_RADIUS);
        }
    }

    /** @param {number} dt */
    updateStarsBy(dt, otherGalaxy) {
        for (let i = 0; i < this.length; i++) {
            const position = this._positions[i];
            const velocity = this._velocities[i];

            addGravity(velocity, position, this, dt);
            addGravity(velocity, position, otherGalaxy, dt);
            position.addScaledVector(velocity, dt);
        }
    }

    /** @param {number} dt */
    updateBy(dt, otherGalaxy) {
        addGravity(this.velocity, this.position, otherGalaxy, dt);
        this.position.addScaledVector(this.velocity, dt);
    }
}

const milkyWay = new Galaxy({
    starCount: MILKY_WAY_STARS,
    position: new Vec3(-5, 0, 0).multiplyScalar(DISTANCE_SCALE),
    velocity: new Vec3(),
    radius: MAX_ORBITAL_RADIUS,
    thickness: MILKY_WAY_THICKNESS,
    color: new Colour(0.9, 0.9, 1)
});

const andromeda = new Galaxy({
    starCount: ANDROMEDA_STARS,
    position: new Vec3(3, 0, 0).multiplyScalar(DISTANCE_SCALE),
    velocity: new Vec3(0, 3, 0),
    radius: MAX_ORBITAL_RADIUS,
    thickness: ANDROMEDA_THICKNESS,
    color: new Colour(0, 0.5, 1)
});

let frameRate = 10;

const simulation = Simulation
    .with({
        htmlDivId: 'galacticCollisionContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: {
            position: new Vec3(-5.2, 3.5, 9.1),
            target: new Vec3(-1.5, -0.35, -0.45),
            fieldOfView: 42
        },
        scene: { background: ThreeJsScene.Background.STARS },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌌 Galactic collision</strong><br/>' +
                'A simplified model of the Milky Way and Andromeda approaching one another, based on ' +
                '<a href="https://github.com/SamirOmarov/galactic-collision">Samir Omarov\'s original simulation</a>. ' +
                'Each star is accelerated by the gravitational field of the two galactic centres; ' +
                'the stars do not exert individual forces on one another.'
        }
    })
    .bind(milkyWay.alwaysWith(new PointCloudView()))
    .bind(andromeda.alwaysWith(new PointCloudView()))
    .runsEvery(1 / frameRate)
    .advancesBy(DELTA_T);

simulation
    .append(new Slider('Animation speed')
        .withRange(new Range(1, 100, 1))
        .withValue(frameRate)
        .onInput(value => {
            frameRate = value;
            simulation.runsEvery(1 / frameRate);
        }))
    .onStep((_clock, dt) => {
        milkyWay.updateStarsBy(dt, andromeda);
        andromeda.updateStarsBy(dt, milkyWay);
        milkyWay.updateBy(dt, andromeda);
        andromeda.updateBy(dt, milkyWay);
    })
    .start();
