import {CircleGeometry, Mesh, MeshBasicMaterial} from "three";
import {
    Button, RadialSymmetricBody, Range, Simulation, Slider, SphereSphereCollision, Trail,
    Vec2, Vec3
} from "../../../src/index.js";
import {Renderable2D} from "../../../src/view/renderer.js";

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const BIN_COUNT = 30;
const MAX_SPEED = 12;
const AVERAGING_FRAMES = 100;

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
    static ContainerType = Object.freeze({
        Box: "box",
        Sphere: "sphere"
    });

    static bounceWithinSphere = (particle, limit) => {
        if (particle.position.lengthSq() > limit * limit)
            particle.state.velocity.negate();
    };

    static bounceWithinBox = (particle, limit) => {
        ["x", "y", "z"].forEach(axis => {
            if (particle.position[axis] > limit || particle.position[axis] < -limit)
                particle.velocity[axis] *= -1;
        });
    };

    /**
     * @param param0
     * @param {number} param0.particleCount Number of particles in gas
     * @param {number} param0.containerSize Size of container
     * @param {number} param0.particleRadius Radius of particles
     * @param {number} param0.particleMass Mass of particles
     * @param {number} param0.initialSpeed Initial speed of particles
     * @param {string} param0.containerType The container the gas is placed in
     */
    constructor({
        particleCount = PARTICLE_COUNT,
        containerSize = CONTAINER_SIZE,
        particleRadius = 0.08,
        particleMass = 1,
        initialSpeed = 2,
        containerType = Gas2D.ContainerType.Sphere
    } = {}) {
        this._particles = [];
        this._baseParticleCount = particleCount;
        this._containerSize = containerSize;
        this._particleRadius = particleRadius;
        this._particleMass = particleMass;
        this._temperature = particleMass * initialSpeed * initialSpeed / 2;
        this._collisionHandler = new SphereSphereCollision();
        this._k = 1;
        this._limitToContainer = containerType === Gas2D.ContainerType.Box ?
            Gas2D.bounceWithinBox: Gas2D.bounceWithinSphere;
        this.addParticles(particleCount);
    }

    /** @returns {ArrayIterator<RadialSymmetricBody>} */
    [Symbol.iterator]() {
        return this._particles[Symbol.iterator]();
    }
    
    get temperature() { return this._temperature; }
    get activeParticleCount() { return this._particles.length; }

    /** @param {number} numberOfParticles */
    addParticles(numberOfParticles = PARTICLES_TO_ADD) {
        for (let i = 0; i < numberOfParticles; i++)
            this._particles.push(new RadialSymmetricBody({
                velocity: this.#newInitialVelocity(this._temperature),
                radius: this._particleRadius,
                mass: this._particleMass
            }));
    }

    #newInitialVelocity(temperature) {
        // Init speed based on temperature: v_rms^2 = 2 k T / m (2D)
        const averageKineticEnergy = Math.sqrt(2 * this._k * temperature / this._particleMass);
        const angle = Math.random() * 2 * Math.PI;
        return new Vec2(Math.cos(angle), Math.sin(angle)).multiplyScalar(averageKineticEnergy);
    }

    /** @param {number} newTemperature */
    set temperature(newTemperature) {
        if (newTemperature <= 0)
            throw new Error("Temperature must be greater than zero.");

        const scale = Math.sqrt(newTemperature / this._temperature);
        for (const particle of this._particles.slice(1, this._particles.length))
            particle.velocity.multiplyScalar(scale);
        this._temperature = newTemperature;
    }

    reset(temperature = this._temperature) {
        this._particles.length = this._baseParticleCount;
        this._temperature = temperature;
        for (let i = 0; i < this._baseParticleCount; i++)
            this.#resetParticle(this._particles[i], i === 0 ? 0 : this._temperature);
    }

    computeTheoreticalCurve(meanV2, binCount, maxSpeed) {
        const binSize = maxSpeed / binCount;
        const T = meanV2 / 2;   // effective temperature

        const theory = [];
        for (let i = 0; i < binCount; i++) {
            const v = (i + 0.5) * binSize;
            const value = (v / T) * Math.exp(-v * v / (2 * T));
            theory.push(value);
        }

        // normalize so that area is equal to histogram
        const sumTheory = theory.reduce((a, b) => a + b, 0);
        const scale = this._particles.length / sumTheory;
        return theory.map(v => v * scale);
    }

    /**
     * @param {number} binCount
     * @param {number} maxSpeed
     */
    speedDistribution(binCount = BIN_COUNT, maxSpeed = MAX_SPEED) {
        const bins = new Array(binCount).fill(0);
        const binSize = maxSpeed / binCount;
        let sumV2 = 0;

        for (const particle of this._particles) {
            sumV2 += particle.velocity.lengthSq();
            const speed = particle.velocity.length();
            const index = Math.min(Math.floor(speed / binSize), binCount - 1);
            bins[index]++;
        }

        const meanV2 = sumV2 / this._particles.length;
        return {
            speeds: Array.from({ length: binCount }, (_, i) => (i + 0.5) * binSize),
            bins,
            theory: this.computeTheoreticalCurve(meanV2, binCount, maxSpeed)
        };
    }

    /** @param {number} dt */
    evolve(dt) {
        const particles = this._particles.slice(0, this._particles.length);
        const limit = this._containerSize * .5 - this._particleRadius;
        for (const particle of particles) {
            this._limitToContainer(particle, limit);
            particle.integrate(dt);
        }
        for (let i = 0; i < particles.length; i++)
            for (let j = i + 1; j < particles.length; j++)
                particles[i].and(particles[j]).apply(this._collisionHandler);
    }

    #resetParticle(particle, temperature) {
        const half = this._containerSize / 2 - particle.radius;
        particle.position.set((Math.random() * 2 - 1) * half, (Math.random() * 2 - 1) * half);
        if (temperature === 0) {
            particle.velocity.set(0, 0);
            return;
        }
        particle.velocity.copy(this.#newInitialVelocity(temperature));
    }
}

const gas = new Gas2D();
const particleViews = [];
const tracerTrail = new Trail({ maxPoints: 150, trailStep: 2, color: 0xBF40BF });
const histogramBuffer = [];
const speedAxis = Array.from({ length: BIN_COUNT }, (_, i) => (i + 0.5) * MAX_SPEED / BIN_COUNT);

const temperatureSlider = new Slider("Temperature")
    .withRange(new Range(0.1, MAX_SPEED * .5, 0.1))
    .withValue(gas.temperature)
    .onInput(event => gas.temperature = Number(event.target.value));

const simulation = Simulation
    .with({
        htmlDivId: "idealGas2dContainer",
        camera: { position: new Vec3(0, 0, CONTAINER_SIZE), orthographic: true, controls: false },
        lighting: { enabled: false },
        infoPanel: {
            text: "<strong>🎈 2D gas</strong><br/>Velocity of an ideal two-dimensional gas in a square container."
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_, dt) => gas.evolve(dt))
    .appendStartStopResetUI()
    .append(new Button()
        .withText("Show")
        .onClick(() => particleViews.forEach((view, index) =>
            view.visible = index < gas.activeParticleCount))
        .togetherWith(new Button()
            .withText("Hide")
            .onClick(() => particleViews.slice(1).forEach(view => view.visible = false))
            .togetherWith(new Button()
                .withText(`+${PARTICLES_TO_ADD} particles`)
                .onClick(() => {
                    gas.addParticles(PARTICLES_TO_ADD);
                    const startIndex = particleViews.length;
                    Array.from(gas).forEach((particle, index) =>
                        bindParticle(particle, startIndex + index));
                })
            )))
    .append(temperatureSlider)
    .setupGraphWith({
        dataDefinition: [
            {},
            { label: "Simulation", color: "cyan", fill: "rgba(0, 255, 255, 0.2)" },
            { label: "Maxwell (2D)", color: "orange" }
        ],
        height: 250,
        title: "Speed Distribution (averaged)",
        xLabel: "Speed",
        yLabel: "Particles"
    })
    .onFrame(() => {
        const { bins, theory } = gas.speedDistribution();
        histogramBuffer.push(bins);
        if (histogramBuffer.length > AVERAGING_FRAMES)
            histogramBuffer.shift();

        const averaged = new Array(BIN_COUNT).fill(0);
        for (const frame of histogramBuffer)
            for (let i = 0; i < BIN_COUNT; i++)
                averaged[i] += frame[i];
        for (let i = 0; i < BIN_COUNT; i++)
            averaged[i] /= histogramBuffer.length;

        const graphData = simulation._plot.graphData;
        graphData[0].length = 0;
        graphData[1].length = 0;
        graphData[2].length = 0;
        for (let i = 0; i < BIN_COUNT; i++) {
            graphData[0].push(speedAxis[i]);
            graphData[1].push(averaged[i]);
            graphData[2].push(theory[i]);
        }
        simulation._plot.update();
    })
    .onReset(() => {
        gas.reset(temperatureSlider.value);
        particleViews.slice(PARTICLE_COUNT).forEach(view => view.visible = false);
        particleViews.slice(0, PARTICLE_COUNT).forEach(view => view.visible = true);
        tracerTrail.reset();
        histogramBuffer.length = 0;
    })
    .start();

function bindParticle(particle, index) {
    const particleView = new ParticleView2D({ color: index === 0 ? 0xff0000 : particleColor });
    particleViews.push(particleView);
    simulation.bind(particle.alwaysWith(particleView));
    if (index === 0)
        simulation.bind(particle.alwaysWith(tracerTrail));
}

let particleColor = 0xffff00;
Array.from(gas).forEach(bindParticle);
particleColor = 0x00ffff;
