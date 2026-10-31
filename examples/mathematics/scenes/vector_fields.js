import {ArrowField, Integrators, Simulation, VectorField, Range, Vec3} from "../../../src/index.js";

const X_RANGE = new Range(-1, 0.8, .2);
const Y_RANGE = new Range(-1, 0.8, .1);
const Z_RANGE = new Range(-1, 0.8, .2);

const STEP_SIZE = 0.25;
const JITTER = 0.1;
const RESPAWN_CHANCE = 0.0005;

class VectorField1 extends VectorField {
    constructor() {
        super();
        this.meta = "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} =" +
            "\\begin{pmatrix} \\sin(\\pi x)\\cos(\\pi y)\\cos(\\pi z) \\\\ " +
            "-\\cos(\\pi  x)\\sin(\\pi y)\\cos(\\pi z) \\\\" +
            " (\\sqrt{(2 / 3)} \\cos(\\pi x)\\cos(\\pi y)\\sin(\\pi z)) \\end{pmatrix}";
    }

    sample(position, target) {
        const u = Math.sin(Math.PI * position.x) * Math.cos(Math.PI * position.y) * Math.cos(Math.PI * position.z);
        const v = -Math.cos(Math.PI * position.x) * Math.sin(Math.PI * position.y) * Math.cos(Math.PI * position.z);
        const w = Math.sqrt(2.0 / 3.0) * Math.cos(Math.PI * position.x) * Math.cos(Math.PI * position.y) * Math.sin(Math.PI * position.z);
        target.set(u, v, w);
    }
}

/**
 * Moves the arrow sample positions along the vector field.
 * Each arrow has its own particle, initialized near its original grid position.
 */
class AnimatedVectorField extends VectorField1 {
    constructor({xRange, yRange, zRange}) {
        super();

        this._xRange = xRange;
        this._yRange = yRange;
        this._zRange = zRange;
        this._yCount = yRange.count;
        this._zCount = zRange.count;
        this._particles = [];

        for (const x of xRange)
            for (const y of yRange)
                for (const z of zRange) {
                    const home = new Vec3(x, y, z);
                    this._particles.push({
                        home,
                        position: this.#jitteredPosition(home)
                    });
                }

        // Reusable derivative vectors for Integrators.rk4VectorStep().
        this._derivatives = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    }

    #jitteredPosition(home) {
        return new Vec3(
            home.x + (Math.random() * 2 - 1) * JITTER,
            home.y + (Math.random() * 2 - 1) * JITTER,
            home.z + (Math.random() * 2 - 1) * JITTER
        );
    }

    #sample(position, target) {
        super.sample(position, target);
    }

    /** @param {number} elapsedTime Elapsed wall-clock time in seconds. */
    advance(elapsedTime) {
        const dt = Math.min(elapsedTime, 0.05) * STEP_SIZE;
        if (dt <= 0)
            return;

        for (const particle of this._particles) {
            if (Math.random() < RESPAWN_CHANCE) {
                particle.position.copy(this.#jitteredPosition(particle.home));
                continue;
            }

            let stage = 0;
            Integrators.rk4VectorStep(particle.position, dt, position => {
                const derivative = this._derivatives[stage++];
                VectorField1.prototype.sample.call(this, position, derivative);
                return derivative;
            });
        }
    }

    sample(position, target) {
        // ArrowField samples its regular grid in x/y/z iteration order.
        const i = Math.round((position.x - this._xRange.from) / this._xRange.stepSize);
        const j = Math.round((position.y - this._yRange.from) / this._yRange.stepSize);
        const k = Math.round((position.z - this._zRange.from) / this._zRange.stepSize);
        const index = (i * this._yCount + j) * this._zCount + k;
        const particle = this._particles[index];

        if (particle) {
            position.copy(particle.position);
            super.sample(position, target);
        } else {
            super.sample(position, target);
        }
    }
}

const animatedVectorField = new AnimatedVectorField({
    xRange: X_RANGE,
    yRange: Y_RANGE,
    zRange: Z_RANGE
});

const arrowField = new ArrowField({
    xRange: X_RANGE,
    yRange: Y_RANGE,
    zRange: Z_RANGE,
    magnitudeMap: _m => .15
});

let previousClockTime = null;

const simulation = Simulation.with({
    htmlDivId: "vectorFieldsContainer",
    camera: {
        position: new Vec3(10, 10, 10)
    }
});

simulation
    .bind(animatedVectorField.alwaysWith(arrowField))
    .provideAxesAround(arrowField)
    .frameSceneOn(arrowField, {
        padding: 1.1,
        viewDirection: new Vec3(.5, 0.3, 1)
    })
    .setLatexTitle(animatedVectorField.meta)
     .maxOutCpu(clock => {
        // maxOutCpu may invoke its callback several times per frame.
        // Advance only once for each newly received animation timestamp.
        if (clock.clockTime === previousClockTime)
            return;

        if (previousClockTime !== null)
            animatedVectorField.advance((clock.clockTime - previousClockTime) * 0.001);

        previousClockTime = clock.clockTime;
    }, 30, 1)
    .start();
