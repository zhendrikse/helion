import { ModelObject, ModelObjectsCollection } from '../behavior.js';
import { PhysicsState, RadialSymmetricBody } from './bodies.js';
import { Integrators } from '../math/numerics/integrators/integrators.js';
import { SphereSphereCollision } from '../transformations/interactions.js';
import { Vec2, Vec3, Segments } from '../math/objects.js';
import { sampleNormalDistribution } from '../math/math.js';
import { Colour } from "../../view/colormappers.js";

export class PointCloud extends ModelObject {
    /**
     * @param {{
     *     positions?: Vec3[],
     *     velocities?: Vec3[],
     *     masses?: number[],
     *     colors?: Colour[],
     *     sizes?: number[]
     * }} param0
     */
    constructor({
        positions = [],
        velocities = [],
        masses = [],
        colors = [],
        sizes = [],
    } = {}) {
        super();
        this._positions = positions;
        this._colors = colors;
        this._sizes = sizes;
        this._masses = masses;
        this._velocities = velocities;
        this._particleState = new PhysicsState();
    }

    /** @param {number} index */
    particleAt(index) {
        this._particleState.position.copy(this._positions[index]);
        this._particleState.velocity.copy(this._velocities[index]);
        this._particleState.mass = this._masses[index];
        return this._particleState;
    }

    integrate(dt, accelerationFn, integrator = Integrators.symplecticEulerStep) {
        for (let i = 0; i < this.length; i++) {
            const particle = this.particleAt(i);
            integrator(particle, dt, accelerationFn);
            this._positions[i] = this._particleState.position;
            this._velocities[i] = this._particleState.velocity;
        }
    }

    get length() { return this._positions.length; }

    /** @param {number} index */
    positionAt(index) { return this._positions[index]; }
    /** @param {number} index */
    colorAt(index) { return this._colors[index]; }
    /** @param {number} index */
    sizeAt(index) { return this._sizes[index]; }
}

export class Gas extends ModelObjectsCollection{
    static bounceWithinSphere = (particle, limit) => {
        if (particle.position.lengthSq() <= limit * limit)
            return;

        const normal = particle.position.clone().normalize();
        const normalSpeed = particle.velocity.dot(normal);
        if (normalSpeed > 0)
            particle.velocity.addScaledVector(normal, -2 * normalSpeed);

        particle.position.setLength(limit);
    };

    static bounceWithinBox = (particle, limit) => {
        ['x', 'y', 'z'].forEach(axis => {
            if (particle.position[axis] > limit) {
                particle.position[axis] = limit;
                particle.velocity[axis] = -Math.abs(particle.velocity[axis]);
            } else if (particle.position[axis] < -limit) {
                particle.position[axis] = -limit;
                particle.velocity[axis] = Math.abs(particle.velocity[axis]);
            }
        });
    };

    /**
    * @param {Partial<{
    *     particleCount: number,
    *     containerSize: number,
    *     particleRadius: number,
    *     particleMass: number,
    *     tracerRadius: number,
    *     tracerMass: number,
    *     initialSpeed: number,
    *     dimensions: 2 | 3,
    *     containerFunction: (particle: RadialSymmetricBody, limit: number) => void
    * }>} [param0={}] Optional gas configuration
     */
    constructor({
        particleCount = 200,
        containerSize = 10,
        particleRadius = 0.08,
        particleMass = 1,
        tracerRadius = 0.08,
        tracerMass = 1,
        initialSpeed = 2,
        dimensions = 2,
        containerFunction = Gas.bounceWithinBox
    } = {}) {
        super();
        if (dimensions !== 2 && dimensions !== 3)
            throw new Error('Gas dimensions must be either 2 or 3.');

        this._baseParticleCount = particleCount;
        this._containerSize = containerSize;
        this._dimensions = dimensions;
        this._spheres = new Segments();
        this._particleRadius = particleRadius;
        this._particleMass = particleMass;
        this._temperature = particleMass * initialSpeed * initialSpeed / 2;
        this._collisionHandler = new SphereSphereCollision();
        this._k = 1;
        this._limitToContainer = containerFunction;

        const tracer = new RadialSymmetricBody({
            velocity: this.#newInitialVelocity(this._temperature),
            radius: tracerRadius,
            mass: tracerMass
        });
        this.add(tracer);
        this._spheres.add(tracer);
        this.addParticles(particleCount);
    }

    /** @param {number} mass */
    set tracerMass(mass) { this._bindables[0].state.mass = mass; }
    get tracerMass() { return this._bindables[0].state.mass; }
    get tracer() { return this._bindables[0]; }
    get spheres() { return this._spheres; }
    get temperature() { return this._temperature; }

    /**
     * @param {number} numberOfParticles
     * @return {ModelObjectsCollection<RadialSymmetricBody>}
     */
    addParticles(numberOfParticles = 50) {
        /** @type ModelObjectsCollection<RadialSymmetricBody> */
        const newParticles = new ModelObjectsCollection();
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = new RadialSymmetricBody({
                position: this._dimensions === 3 ? this.#randomPosition(this._bindables.length) : new Vec3(),
                velocity: this.#newInitialVelocity(this._temperature),
                radius: this._particleRadius,
                mass: this._particleMass
            });
            newParticles.add(particle);
            this.add(particle);
            this._spheres.add(particle);
        }
        return newParticles;
    }

    /** @param {number} temperature */
    #newInitialVelocity(temperature) {
        if (this._dimensions === 3) {
            // Each Cartesian component is Gaussian with variance kT/m.
            const sigma = Math.sqrt(this._k * temperature / this._particleMass);
            return new Vec3(
                sampleNormalDistribution(0, sigma),
                sampleNormalDistribution(0, sigma),
                sampleNormalDistribution(0, sigma)
            );
        }

        // In 2D, preserve the original fixed-speed initialization.
        const speed = Math.sqrt(2 * this._k * temperature / this._particleMass);
        const angle = Math.random() * 2 * Math.PI;
        return new Vec2(Math.cos(angle), Math.sin(angle)).multiplyScalar(speed);
    }

    #randomPosition(placedCount = this._bindables.length) {
        const halfSize = this._containerSize * 0.5 - this._particleRadius;
        const sphericalContainer = this._limitToContainer === Gas.bounceWithinSphere;

        for (let attempt = 0; attempt < 10000; attempt++) {
            const position = new Vec3(
                (2 * Math.random() - 1) * halfSize,
                (2 * Math.random() - 1) * halfSize,
                this._dimensions === 3 ? (2 * Math.random() - 1) * halfSize : 0
            );

            if (sphericalContainer && position.lengthSq() > halfSize * halfSize)
                continue;

            const overlaps = this._bindables.slice(0, placedCount).some(other => {
                const minimumDistance = this._particleRadius + other.radius;
                return position.distanceSquaredTo(other.position) < minimumDistance * minimumDistance;
            });

            if (!overlaps)
                return position;
        }

        throw new Error('Unable to place a gas particle without overlap. Reduce the particle count or radius.');
    }

    /** @param {number} newTemperature */
    set temperature(newTemperature) {
        if (newTemperature <= 0)
            throw new Error('Temperature must be greater than zero.');

        const scale = Math.sqrt(newTemperature / this._temperature);
        for (const particle of this._bindables.slice(1, this.size))
            particle.velocity.multiplyScalar(scale);
        this._temperature = newTemperature;
    }

    reset(temperature = this._temperature) {
        // Keep the tracer plus the configured number of gas particles.
        this._bindables.length = this._baseParticleCount + 1;
        this._bindings.length = 0;
        this._temperature = temperature;
        this._spheres.clear();
        for (let i = 0; i < this._bindables.length; i++) {
            this.#resetParticle(this._bindables[i], i === 0 ? 0 : this._temperature, i);
            this._spheres.add(this._bindables[i]);
        }
    }

    /**
     * @param {number} meanV2
     * @param {number} binCount
     * @param {number} maxSpeed
     */
    computeTheoreticalCurve(meanV2, binCount, maxSpeed) {
        const binSize = maxSpeed / binCount;
        const effectiveVariance = meanV2 / this._dimensions;
        const theory = [];
        for (let i = 0; i < binCount; i++) {
            const v = (i + 0.5) * binSize;
            const value = this._dimensions === 3 ?
                Math.sqrt(2 / Math.PI) * v * v / Math.pow(effectiveVariance, 1.5) *
                    Math.exp(-v * v / (2 * effectiveVariance)) :
                v / effectiveVariance * Math.exp(-v * v / (2 * effectiveVariance));
            theory.push(value);
        }

        // Normalize the theoretical curve to the number of gas particles.
        const sumTheory = theory.reduce((a, b) => a + b, 0);
        const scale = (this.size - 1) / sumTheory;
        return theory.map(v => v * scale);
    }

    /**
     * @param {number} binCount
     * @param {number} maxSpeed
     * @return {{ speeds: number[], bins: number[], theory: number[] }}
     */
    speedDistribution(binCount = 30, maxSpeed = 10) {
        const bins = new Array(binCount).fill(0);
        const binSize = maxSpeed / binCount;
        let sumV2 = 0;

        for (const particle of this._bindables.slice(1)) { // Skip tracer
            sumV2 += particle.velocity.lengthSq();
            const speed = particle.velocity.length();
            const index = Math.min(Math.floor(speed / binSize), binCount - 1);
            bins[index]++;
        }

        const meanV2 = sumV2 / (this.size - 1);
        return {
            speeds: Array.from({ length: binCount }, (_, i) => (i + 0.5) * binSize),
            bins,
            theory: this.computeTheoreticalCurve(meanV2, binCount, maxSpeed)
        };
    }

    /** @param {number} dt */
    evolve(dt) {
        const particles = this._bindables.slice(0, this.size);
        for (const particle of particles) {
            particle.integrate(dt);
            this._limitToContainer(particle, this._containerSize * .5 - particle.radius);
        }
        for (let i = 0; i < particles.length; i++)
            for (let j = i + 1; j < particles.length; j++)
                particles[i].and(particles[j]).apply(this._collisionHandler);
    }

    /**
     * @param {RadialSymmetricBody} particle
     * @param {number} temperature
     */
    #resetParticle(particle, temperature, index) {
        particle.position.copy(index === 0 || this._dimensions === 2 ? new Vec3() : this.#randomPosition(index));
        if (temperature === 0) {
            particle.velocity.set(0, 0, 0);
            return;
        }
        particle.velocity.copy(this.#newInitialVelocity(temperature));
    }

    /** @param {(particle: RadialSymmetricBody, limit: number) => void} limitFunction */
    set limitToContainer(limitFunction) {
        this._limitToContainer = limitFunction;
    }
}
