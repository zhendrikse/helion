import { MathPhysicsModelBehavior } from '../../core/helion.js';
import { PhysicsState, RadialSymmetricBody } from './bodies.js';
import { Integrators } from '../math/numerics/integrators/integrators.js';
import { SphereSphereCollision } from '../transformations/interactions.js';
import { Vec2 } from '../math/math.js';

export class PointCloud extends MathPhysicsModelBehavior {
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

    positionAt(index) { return this._positions[index]; }
    colorAt(index) { return this._colors[index]; }
    sizeAt(index) { return this._sizes[index]; }
}

export class Gas {
    static bounceWithinSphere = (particle, limit) => {
        if (particle.position.lengthSq() > limit * limit)
            particle.state.velocity.negate();
    };

    static bounceWithinBox = (particle, limit) => {
        ['x', 'y', 'z'].forEach(axis => {
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
     * @param {number} param0.tracerRadius Radius of particles
     * @param {number} param0.tracerMass Mass of particles
     * @param {number} param0.initialSpeed Initial speed of particles
     * @param {(particle: AxialSymmetricBody, limit: number) => void} param0.containerFunction
     */
    constructor({
        particleCount = 200,
        containerSize = 10,
        particleRadius = 0.08,
        particleMass = 1,
        tracerRadius = 0.08,
        tracerMass = 1,
        initialSpeed = 2,
        containerFunction = Gas.bounceWithinBox
    } = {}) {
        this._particles = [];
        this._baseParticleCount = particleCount;
        this._containerSize = containerSize;
        this._particleRadius = particleRadius;
        this._particleMass = particleMass;
        this._temperature = particleMass * initialSpeed * initialSpeed / 2;
        this._collisionHandler = new SphereSphereCollision();
        this._k = 1;
        this._limitToContainer = containerFunction;

        this._particles.push(new RadialSymmetricBody({
            velocity: this.#newInitialVelocity(this._temperature),
            radius: tracerRadius,
            mass: tracerMass
        }));
        this.addParticles(particleCount);
    }

    /** @param {number} mass */
    set tracerMass(mass) {
        this._particles[0].state.mass = mass;
    }

    /** @returns {ArrayIterator<RadialSymmetricBody>} */
    [Symbol.iterator]() {
        return this._particles[Symbol.iterator]();
    }

    /** @returns {ArrayIterator<[number, RadialSymmetricBody]>} */
    entries() {
        return this._particles.entries();
    }

    get temperature() { return this._temperature; }
    get particleCount() { return this._particles.length; }

    /** @param {number} numberOfParticles */
    addParticles(numberOfParticles = 50) {
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
            throw new Error('Temperature must be greater than zero.');

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
     * @return {{ speeds: number[], bins: number[], theory: number[] }}
     */
    speedDistribution(binCount = 30, maxSpeed = 10) {
        const bins = new Array(binCount).fill(0);
        const binSize = maxSpeed / binCount;
        let sumV2 = 0;

        for (const particle of this._particles.slice(1)) { // Skip tracer
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
        particle.position.set(0, 0, 0);
        if (temperature === 0) {
            particle.velocity.set(0, 0);
            return;
        }
        particle.velocity.copy(this.#newInitialVelocity(temperature));
    }

    /** @param {(particle: AxialSymmetricBody, limit: number) => void} limitFunction */
    set limitToContainer(limitFunction) {
        this._limitToContainer = limitFunction;
    }
}
