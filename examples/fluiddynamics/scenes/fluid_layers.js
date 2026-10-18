import {
    Block, Box, Button, Colour, RadialSymmetricBody, BindableCollection, ViewsCollection,
    Simulation, Sphere, Vec3
} from '../../../src/index.js';

const K_WALL = 100000;
const DRAG = 800;
const COULOMB_K = 9e9;
const CHARGE = 1e-4;
const GRAVITY = new Vec3(0, -5000, 0);
const TIME_STEP = 0.001;

const CAVITY_SIZE = new Vec3(5, 12, 0.01);
const BOWL_SIZE = new Vec3(22, 12, 7);
const LAYER_SIZE = new Vec3(0.2, 12, 1);
const CAVITY_HALF_SIZE = CAVITY_SIZE.clone().multiplyScalar(0.5);

const cavity = new Block({ size: CAVITY_SIZE.clone(), position: new Vec3() });
const bowl = new Block({ size: BOWL_SIZE.clone(), position: new Vec3() });
const permeableLayer = new Block({ size: LAYER_SIZE.clone(), position: new Vec3() });

function gaussian(mean = 0, standardDeviation = 1) {
    let u1 = Math.random();
    while (u1 === 0)
        u1 = Math.random();
    const u2 = Math.random();
    return mean + standardDeviation * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function randomDirection() {
    const direction = new Vec3(
        2 * Math.random() - 1,
        2 * Math.random() - 1,
        2 * Math.random() - 1
    );
    if (direction.lengthSq() < 1e-12)
        return direction.set(1, 0, 0);
    return direction.normalize();
}

function randomPosition({ xMin = -CAVITY_HALF_SIZE.x, xMax = CAVITY_HALF_SIZE.x } = {}) {
    return new Vec3(
        xMin + Math.random() * (xMax - xMin),
        (2 * Math.random() - 1) * CAVITY_HALF_SIZE.y,
        0
    );
}

class ChargedParticle extends RadialSymmetricBody {
    constructor({ position, radius, mass, color, initialSpeed = 0 } = {}) {
        super({
            position,
            radius,
            mass,
            velocity: randomDirection().multiplyScalar(gaussian(initialSpeed, 1))
        });
        this.q0 = CHARGE;
        this.particleColor = color;
    }
}

class RedParticle extends Block {
    constructor(position) {
        super({
            position,
            size: new Vec3(0.7, 0.7, 0.7),
            mass: 0.13
        });
        this.q0 = CHARGE;
        this.isLayerSensitive = true;
    }
}

const blueParticles = new BindableCollection();
const yellowParticles = new BindableCollection();
const greenParticles = new BindableCollection();
const redParticles = new BindableCollection();
const allParticles = [];

function addParticle(collection, particle) {
    collection.add(particle);
    allParticles.push(particle);
}

const blueViews = ViewsCollection.of(Sphere).with({ color: Colour.Blue, segments: 16 });
const yellowViews = ViewsCollection.of(Sphere).with({ color: Colour.Yellow, segments: 16 });
const greenViews = ViewsCollection.of(Sphere).with({ color: Colour.Green, segments: 16 });
const redViews = ViewsCollection.of(Box).with({ color: Colour.Red, opacity: 1 });

function createParticles() {
    for (let i = 0; i < 40; i++)
        addParticle(blueParticles, new ChargedParticle({
            position: randomPosition(),
            radius: 0.6 / 1.5,
            mass: 0.3,
            color: Colour.Blue
        }));

    // These smaller particles are deliberately seeded around the membrane
    // so their diffusion through the layer can be compared.
    for (let i = 0; i < 30; i++) {
        addParticle(yellowParticles, new ChargedParticle({
            position: randomPosition({ xMin: -1, xMax: 1 }),
            radius: 0.5 / 1.5,
            mass: 0.03,
            color: Colour.Yellow
        }));
        addParticle(greenParticles, new ChargedParticle({
            position: randomPosition({ xMin: -1, xMax: 1 }),
            radius: 0.4 / 1.5,
            mass: 0.01,
            color: Colour.Green
        }));
    }

    // The source Python used an impossible condition (random() < 0) for
    // these cubes. Seed a small population on the right so the selective
    // membrane interaction is visible.
    for (let i = 0; i < 12; i++)
        addParticle(redParticles, new RedParticle(randomPosition({ xMin: 0.35, xMax: CAVITY_HALF_SIZE.x })));
}

function applyParticleForces(particles, allParticles) {
    for (const particle of particles) {
        particle.force.set(0, 0, 0);
        particle.force.add(particle.velocity.clone().multiplyScalar(-DRAG));
        particle.force.add(GRAVITY.clone().multiplyScalar(particle.mass));

        for (const other of allParticles) {
            if (particle === other)
                continue;

            const displacement = other.position.clone().sub(particle.position);
            const distance = displacement.length();
            if (distance < 0.01 || distance >= 1.5)
                continue;

            const magnitude = COULOMB_K * particle.q0 * other.q0 *
                (1 / (distance * distance) - 3 / (distance * distance * distance));
            particle.force.add(displacement.normalize().multiplyScalar(magnitude));
        }

        // A small stochastic kick models the agitation in the original demo
        // without the unbounded momentum growth caused by adding 7 each step.
        particle.velocity.add(new Vec3(
            2 * Math.random() - 1,
            2 * Math.random() - 1,
            2 * Math.random() - 1
        ).multiplyScalar(0.005));
    }
}

function applyWallAndMembraneForces(particle) {
    const r = particle.position;
    if (r.x > CAVITY_HALF_SIZE.x)
        particle.force.x -= K_WALL * (r.x - CAVITY_HALF_SIZE.x);
    if (r.x < -CAVITY_HALF_SIZE.x)
        particle.force.x += K_WALL * (-CAVITY_HALF_SIZE.x - r.x);
    if (r.y > CAVITY_HALF_SIZE.y)
        particle.force.y -= K_WALL * (r.y - CAVITY_HALF_SIZE.y);
    if (r.y < -CAVITY_HALF_SIZE.y)
        particle.force.y += K_WALL * (-CAVITY_HALF_SIZE.y - r.y);
    if (r.z > CAVITY_HALF_SIZE.z)
        particle.force.z -= K_WALL * (r.z - CAVITY_HALF_SIZE.z);
    if (r.z < -CAVITY_HALF_SIZE.z)
        particle.force.z += K_WALL * (-CAVITY_HALF_SIZE.z - r.z);

    // The red cubes are too large to pass through the permeable layer.
    if (particle.isLayerSensitive && r.x < LAYER_SIZE.x / 2)
        particle.force.x += K_WALL * (LAYER_SIZE.x / 2 - r.x);
}

createParticles();

const simulation = Simulation
    .with({
        htmlDivId: 'fluidLayersContainer',
        viewport: { aspectRatio: '16/9', parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 1, 28),
            target: new Vec3(0, 0, 0),
            orthographic: true,
            controls: true
        },
        lighting: { enabled: true },
        infoPanel: {
            text: '<strong>Fluid layers</strong><br/>' +
                'Particles move under gravity, drag and short-range pair forces. ' +
                'The red membrane selectively blocks the larger red particles, while the smaller colored particles diffuse around it.'
        },
        headUpDisplay: { enabled: false }
    })
    .bind(cavity.alwaysWith(new Box({ color: Colour.White, opacity: 0.1 })))
    .bind(bowl.alwaysWith(new Box({ color: Colour.White, opacity: 0.08 })))
    .bind(permeableLayer.alwaysWith(new Box({ color: Colour.Red, opacity: 0.22 })))
    .bind(blueParticles.alwaysWith(blueViews))
    .bind(yellowParticles.alwaysWith(yellowViews))
    .bind(greenParticles.alwaysWith(greenViews))
    .bind(redParticles.alwaysWith(redViews))
    .runsEvery(TIME_STEP)
    .advancesBy(TIME_STEP)
    .onStep((_clock, dt) => {
        applyParticleForces(allParticles, allParticles);
        for (const particle of allParticles)
            applyWallAndMembraneForces(particle);
        for (const particle of allParticles)
            particle.integrate(dt);
    });

simulation.append(new Button('↻ Restart').withText('↻ Restart').onClick(() => {
    for (const particle of allParticles)
        particle.reset();
    simulation.start();
}));

simulation.start();
