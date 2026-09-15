import { CircleGeometry, Mesh, MeshBasicMaterial, BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments } from "three";
import { Button, RadialSymmetricBody, Simulation, Slider, SphereSphereCollision, Trail, Vec2, Vec3 } from "../../../src/index.js";
import { Renderable2D } from "../../../src/view/renderer.js";

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const INITIAL_SPEED = 2;
const INITIAL_TEMPERATURE = INITIAL_SPEED * INITIAL_SPEED / 2;
const TRACER_COLOR = 0xff0000;
const PARTICLE_COLOR = 0xffff00;
const TRAIL_COLOR = 0xBF40BF;

class ParticleView2D extends Renderable2D {
    constructor({ color = PARTICLE_COLOR } = {}) {
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
        particleRadius = 0.08,
        particleMass = 1,
        initialSpeed = INITIAL_SPEED
    } = {}) {
        this._particles = [];
        this._baseParticleCount = particleCount;
        this._activeParticleCount = particleCount;
        this._containerSize = containerSize;
        this._particleRadius = particleRadius;
        this._particleMass = particleMass;
        this._temperature = particleMass * initialSpeed * initialSpeed / 2;
        this._collisionHandler = new SphereSphereCollision();
        this.#addParticles(particleCount, this._temperature);
    }

    /** @returns {ArrayIterator<RadialSymmetricBody>} */
    [Symbol.iterator]() {
        return this._particles.slice(0, this._activeParticleCount)[Symbol.iterator]();
    }
    get temperature() { return this._temperature; }
    get activeParticleCount() { return this._activeParticleCount; }

    addParticles(numberOfParticles = PARTICLES_TO_ADD) {
        const particles = this.#addParticles(numberOfParticles, this._temperature);
        this._activeParticleCount += numberOfParticles;
        return particles;
    }

    setTemperature(newTemperature) {
        if (newTemperature <= 0)
            throw new Error("Temperature must be greater than zero.");
        const scale = Math.sqrt(newTemperature / this._temperature);
        for (const particle of this._particles.slice(1, this._activeParticleCount))
            particle.velocity.multiplyScalar(scale);
        this._temperature = newTemperature;
    }

    reset(temperature = this._temperature) {
        this._activeParticleCount = this._baseParticleCount;
        this._temperature = temperature;
        for (let i = 0; i < this._baseParticleCount; i++)
            this.#resetParticle(this._particles[i], i === 0 ? 0 : this._temperature);
    }

    evolve(dt) {
        const particles = this._particles.slice(0, this._activeParticleCount);
        for (const particle of particles) {
            particle.integrate(dt);
            this.#confineToBox(particle);
        }
        for (let i = 0; i < particles.length; i++)
            for (let j = i + 1; j < particles.length; j++)
                particles[i].and(particles[j]).apply(this._collisionHandler);
    }

    #addParticles(numberOfParticles, temperature) {
        const particles = [];
        const half = this._containerSize / 2 - this._particleRadius;
        for (let i = 0; i < numberOfParticles; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.sqrt(2 * temperature / this._particleMass);
            const particle = new RadialSymmetricBody({
                position: new Vec2((Math.random() * 2 - 1), (Math.random() * 2 - 1)).multiplyScalar(half),
                velocity: new Vec2(Math.cos(angle), Math.sin(angle)).multiplyScalar(speed),
                radius: this._particleRadius,
                mass: this._particleMass
            });
            this._particles.push(particle);
            particles.push(particle);
        }
        return particles;
    }

    #resetParticle(particle, temperature) {
        const half = this._containerSize / 2 - particle.radius;
        particle.position.set((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
        if (temperature === 0) {
            particle.velocity.set(0, 0);
            return;
        }
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.sqrt(2 * temperature / particle.mass);
        particle.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
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
    const material = new LineBasicMaterial({ color: 0x00ffff });
    return new LineSegments(geometry, material);
}

const gas = new Gas2D();
const container = createContainerView(CONTAINER_SIZE);
const particleViews = [];
const tracerTrail = new Trail({ maxPoints: 150, trailStep: 2, color: TRAIL_COLOR });

const simulation = Simulation
    .with({
        htmlDivId: "gas2dContainer",
        camera: { position: new Vec3(0, 0, 14), orthographic: true, controls: false },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: { text: "<strong>2D gas</strong><br/>First Helion prototype: particles moving in a square container." }
    })
    .runsEvery(0.01)
    .onStep((_, dt) => gas.evolve(dt))
    .addObject3D(container);

function bindParticle(particle, index) {
    const particleView = new ParticleView2D({ color: index === 0 ? TRACER_COLOR : PARTICLE_COLOR });
    particleViews.push(particleView);
    simulation.bind(particle.alwaysWith(particleView));
    if (index === 0)
        simulation.bind(particle.alwaysWith(tracerTrail));
}

Array.from(gas).forEach(bindParticle);

const temperatureSlider = new Slider("Temperature")
    .withRange({ from: 0.1, to: 4, stepSize: 0.1 })
    .withValue(gas.temperature)
    .onInput(event => gas.setTemperature(Number(event.target.value)));

const runButton = new Button()
    .withText("❚❚ Pause")
    .onClick(() => {
        if (simulation.isRunning) {
            simulation.stop();
            runButton.withText("▶︎ Run");
        } else {
            simulation.start();
            runButton.withText("❚❚ Pause");
        }
    });

const resetButton = new Button()
    .withText("⟳ Reset")
    .onClick(() => simulation.reset());

const showButton = new Button()
    .withText("Show")
    .onClick(() => particleViews.forEach((view, index) => view.visible = index < gas.activeParticleCount));

const hideButton = new Button()
    .withText("Hide")
    .onClick(() => particleViews.slice(1).forEach(view => view.visible = false));

const addButton = new Button()
    .withText(`+${PARTICLES_TO_ADD} particles`)
    .onClick(() => {
        const particles = gas.addParticles(PARTICLES_TO_ADD);
        const startIndex = particleViews.length;
        particles.forEach((particle, index) => bindParticle(particle, startIndex + index));
    });

simulation
    .append(runButton.togetherWith(resetButton))
    .append(temperatureSlider)
    .append(showButton.togetherWith(hideButton).togetherWith(addButton))
    .onReset(() => {
        gas.reset(temperatureSlider.value);
        particleViews.slice(PARTICLE_COUNT).forEach(view => view.visible = false);
        particleViews.slice(0, PARTICLE_COUNT).forEach(view => view.visible = true);
        tracerTrail.reset();
        runButton.withText("❚❚ Pause");
    })
    .start();
