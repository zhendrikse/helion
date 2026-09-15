import { CircleGeometry, Mesh, MeshBasicMaterial, BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments } from "three";
import { RadialSymmetricBody, Simulation, SphereSphereCollision, Vec2, Vec3 } from "../../../src/index.js";
import { Renderable2D } from "../../../src/view/renderer.js";

const PARTICLE_COUNT = 200;
const CONTAINER_SIZE = 10;
const PARTICLE_RADIUS = 0.08;
const PARTICLE_MASS = 1;
const INITIAL_SPEED = 2;

const sphereSphereCollision = new SphereSphereCollision();

class ParticleView2D extends Renderable2D {
    constructor({ color = 0xffff00 } = {}) {
        super();

        this._geometry = new CircleGeometry(1, 16);
        this._material = new MeshBasicMaterial({ color });
        this._mesh = new Mesh(this._geometry, this._material);
        this.add(this._mesh);
    }

    canBindTo(particle) {
        if (!particle.position || particle.radius == null)
            throw new Error("ParticleView2D can only bind to particles with a position and radius.");

        return true;
    }

    synchronizeWith(particle) {
        this.position.copy(particle.position);
        this.scale.setScalar(particle.radius);
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
        this.clear();
    }
}

class Gas2D {
    constructor({
        particleCount = PARTICLE_COUNT,
        containerSize = CONTAINER_SIZE,
        particleRadius = PARTICLE_RADIUS,
        particleMass = PARTICLE_MASS,
        initialSpeed = INITIAL_SPEED
    } = {}) {
        this._particles = [];
        this._containerSize = containerSize;

        const half = containerSize / 2 - particleRadius; // Possible location
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * 2 * Math.PI;
            this._particles.push(new RadialSymmetricBody({
                position: new Vec2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).multiplyScalar(half),
                velocity: new Vec2(Math.cos(angle), Math.sin(angle)).multiplyScalar(initialSpeed),
                radius: particleRadius,
                mass: particleMass
            }));
        }
    }

    /** @returns {ArrayIterator<RadialSymmetricBody>} */
    [Symbol.iterator]() {
        return this._particles[Symbol.iterator]();
    }

    evolve(dt) {
        for (const particle of this._particles) {
            particle.integrate(dt);
            this.#confineToBox(particle);
        }

        for (let i = 0; i < this._particles.length; i++)
            for (let j = i + 1; j < this._particles.length; j++)
                this._particles[i].and(this._particles[j]).apply(sphereSphereCollision);
    }

    #confineToBox(particle) {
        const half = this._containerSize / 2;
        const limit = half - particle.radius;

        if (particle.position.x > limit) {
            particle.position.x = limit;
            particle.velocity.x = -Math.abs(particle.velocity.x);
        } else if (particle.position.x < -limit) {
            particle.position.x = -limit;
            particle.velocity.x = Math.abs(particle.velocity.x);
        }

        if (particle.position.y > limit) {
            particle.position.y = limit;
            particle.velocity.y = -Math.abs(particle.velocity.y);
        } else if (particle.position.y < -limit) {
            particle.position.y = -limit;
            particle.velocity.y = Math.abs(particle.velocity.y);
        }
    }
}

function createContainerView(size) {
    const geometry = new EdgesGeometry(new BoxGeometry(size, size, 0.01));
    const material = new LineBasicMaterial({ color: 0xffffff });
    return new LineSegments(geometry, material);
}

const gas = new Gas2D();
const container = createContainerView(CONTAINER_SIZE);

const simulation = Simulation
    .with({
        htmlDivId: "gas2dContainer",
        viewport: { aspectRatio: "1 / 1" },
        camera: {
            position: new Vec3(0, 0, 14),
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: "<strong>2D gas</strong><br/>First Helion prototype: particles moving in a square container."
        }
    })
    .runsEvery(0.01)
    .advancesBy(0.01)
    .onStep((_, dt) => gas.evolve(dt))
    .addObject3D(container)
    .start();

for (const particle of gas)
    simulation.bind(particle.alwaysWith(new ParticleView2D()));
