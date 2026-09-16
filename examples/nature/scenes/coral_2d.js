import {
    ParticleView2D, Simulation, Vec3, Vec2, DropdownMenu, ColorMappers
} from "../../../src/index.js";
import { MathPhysicsModelBehavior } from "../../../src/core/helion.js";
import { Renderable2D } from "../../../src/view/renderer.js";
import { Box3, Vector3 } from "three";

const swarmSize = 1500;
const width = 500;
const height = 500;
const maxDistance = Math.sqrt(width * width + height * height);

function normalize(value, minVal, maxVal) {
    const clampedValue = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    return range === 0.0 ? 0.5 : (clampedValue - minVal) / range;
}

export class ParticleCloud extends MathPhysicsModelBehavior {
    static areColliding(position1, position2) {
        return position1.distanceSquaredTo(position2) < thresholdDistanceSquared;
    }

    /**
     * @param {number} N 
     */
    constructor(N) {
        super();
        this._count = N;
        /** @type {boolean[]} */
        this._frozen = [];
        /** @type {Vec2[]} */
        this._positions = [];
        this._sizes = [];
        this._initialize();
    }

    _initialize() {
        this._frozen.length = 0;
        this._positions.length = 0;
        this._sizes.length = 0;
        for (let i = 0; i < swarmSize; i++) {
            this._frozen.push(false);
            this._sizes.push(3);
            this._positions.push(new Vec2(width * Math.random(), height * Math.random()));
        }
        this._frozen[0] = true;
        this._positions[0].set(width * .5, 2);
    }

    reset() {
        this._initialize();
    }

    update() {
        for (let i = 0; i < this._count; i++)
            this._updateParticleAt(i);
    }

    _updateParticleAt(i) {
        if (this._frozen[i])
            return;

        const dx = Math.random() * noise;
        const dy = Math.random() * noise;
        this._positions[i].x += Math.random() < 0.5 ? dx : -dx;
        this._positions[i].y -= verticalDrift + (Math.random() < 0.5 ? dy : -dy);
        this._positions[i].x = (this._positions[i].x + width) % width;
        if (this._positions[i].y < 0) {
            this._positions[i].y = height;
            this._positions[i].x = width * Math.random();
        }

        this.checkForFreezing(i);
    }

    checkForFreezing(index) {
        for (let i = 0; i < swarmSize; i++) {
            if (!this._frozen[i])
                continue;

            if (ParticleCloud.areColliding(this._positions[index], this._positions[i])) {
                this._frozen[index] = true;
                return;
            }
        }
    }

    get size() { return this._count; }
}

// Per-particle wrapper zodat ParticleView2D (Renderable2D) kan binden.
class CoralParticle extends MathPhysicsModelBehavior {
    constructor(field, index) {
        super();
        this._field = field;
        this._index = index;
    }

    get position() { return this._field._positions[this._index]; }
    get radius() { return this._field._sizes[this._index]; }
    get size() { return this._field._sizes[this._index]; }
    get frozen() { return this._field._frozen[this._index]; }
}

// Helper voor frameSceneOn: berekent union-bounding box van alle particles.
class CoralBounds extends Renderable2D {
    constructor(field) {
        super();
        this._field = field;
    }

    get boundingBox() {
        const box = new Box3();
        for (let i = 0; i < this._field.size; i++) {
            const pos = this._field._positions[i];
            const r = this._field._sizes[i];
            box.expandByPoint(new Vector3(pos.x - r, pos.y - r, pos.z - r));
            box.expandByPoint(new Vector3(pos.x + r, pos.y + r, pos.z + r));
        }
        return box;
    }
}

let thresholdDistance = 5;
let thresholdDistanceSquared = thresholdDistance * thresholdDistance;
const dpr = window.devicePixelRatio || 1;
const noise = 10 / dpr;
const verticalDrift = 1.5 / dpr;

function updateThreshold() {
    const dprNow = window.devicePixelRatio || 1;
    thresholdDistance = 5 * dprNow;
    thresholdDistanceSquared = thresholdDistance * thresholdDistance;
}

const particleField = new ParticleCloud(swarmSize);
const coralBounds = new CoralBounds(particleField);

// Veralgemeniseerd: colorFunction mapt positie -> genormaliseerde scalar (afstand tot seed),
// colorMapper mapt die scalar -> kleur. View doet beide.
let colorMapper = new ColorMappers().get(ColorMappers.Scientific)();
const colorFunction = (particle) => {
    if (!particle.frozen)
        return normalize(0, 0, maxDistance);
    return normalize(1.75 * particle.position.distanceTo(particleField._positions[0]), 0, maxDistance);
};

/** @type {ParticleView2D[]} */
const particleViews = [];

const simulation = Simulation
    .with({
        htmlDivId: "coralContainer",
        camera: {
            controls: false
        }
    })
    .withMouseClickEventListener()
    .onReset(resetSimulation)
    .runsEvery(0.05)
    .onStep(() => particleField.update())
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .addEventListener("change", event => {
            // @ts-ignore
            colorMapper = ColorMappers.get(event.target.value);
            // propagate naar alle bestaande views (veralgemeniseerd model)
            for (const view of particleViews)
                view.colorMapper = colorMapper;
        })
    );

// Bind elke particle individueel aan zijn eigen ParticleView2D met gedeelde
// colorFunction + colorMapper (gegeneraliseerd i.p.v. per-particle Color).
for (let i = 0; i < swarmSize; i++) {
    const handle = new CoralParticle(particleField, i);
    const view = new ParticleView2D({ colorFunction, colorMapper });
    particleViews.push(view);
    simulation.bind(handle.alwaysWith(view));
}

function resetSimulation() {
    updateThreshold();
    particleField.reset();
    simulation.frameSceneOn(coralBounds, {
        padding: 0.5,
        viewDirection: new Vec3(0, 0, 1)
    });
}

resetSimulation();
