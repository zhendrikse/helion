import {
    ColorMapper,
    ParticleView2D, Simulation, ThreeJsRenderer, Vec3
} from "../../../src/index.js";
import {MathPhysicsModelBehavior} from "../../../src/core/helion.js";

const swarmSize = 1500;
const width = 500;
const height = 500;
const maxDistance = Math.sqrt(width * width + height * height);

function normalize(value, minVal, maxVal) {
    const clampedValue = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    return range === 0.0 ? 0.5 : (clampedValue - minVal) / range;
}

class ScientificColorMapper extends ColorMapper {
    map(normalizedValue) {
        const num = Math.floor(4 * normalizedValue);
        const s = 4 * (normalizedValue - num / 4);

        switch (num) {
            case 0 :
                return {r: 0, g: s, b: 1, a: 1};
            case 1 :
                return {r: 0, g: 1, b: 1 - s, a: 1};
            case 2 :
                return {r: s, g: 1 , b: 0, a: 1};
            case 3 :
                return {r: 1, g: 1 - s, b: 0, a: 1};
        }
    }
}

const colorMapper = new ScientificColorMapper();

// TODO The value of the point cloud should be frozen or not
// TODO The color mapper should map colors to frozen particles
// TODO Frozen should become a generalized physical property
// TODO Next, similar approach for star cluster and spiral galaxy
// TODO Next, galactic collision as acid test
export class ParticleCloud extends MathPhysicsModelBehavior {
    static distanceSquared(position1, position2) {
        return (position2.x - position1.x) * (position2.x - position1.x) +
            (position2.y - position1.y) * (position2.y - position1.y) +
            (position2.z - position1.z) * (position2.z - position1.z);
    }

    static distance(position1, position2) {
        return Math.sqrt(ParticleCloud.distanceSquared(position1, position2));
    }

    static areColliding(position1, position2) {
        return ParticleCloud.distanceSquared(position1, position2) < thresholdDistanceSquared;
    }

    constructor(N) {
        super();
        this._count = N;
        this._frozen = [];
        this._positions = [];
        this._sizes = [];
        this._masses = [];
        this._charges = [];

        for (let i = 0; i < swarmSize; i++) {
            this._frozen.push(false);
            this._sizes.push(3);
            this._positions.push(new Vec3(width * Math.random(), height * Math.random(), 0));
        }

        this._frozen[0] = true;
        this._positions[0].set(width * .5, 2, 0);
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

    particleStateAt(index) {
        return {
            position: this._positions[index],
            color: this._frozen[index] ?
                colorMapper.map(normalize(1.75 * ParticleCloud.distance(this._positions[index], this._positions[0]), 0, maxDistance)) :
                colorMapper.map(normalize(0, 0, maxDistance)),
            size: this._sizes[index],
            frozen: this._frozen[index]
        };
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

let thresholdDistance = 5;
let thresholdDistanceSquared = thresholdDistance * thresholdDistance;
const dpr = window.devicePixelRatio || 1;
const noise = 10 / dpr;
const verticalDrift = 1.5 / dpr;
function updateThreshold() {
    const dpr = window.devicePixelRatio || 1;
    thresholdDistance = 5 * dpr;
    thresholdDistanceSquared = thresholdDistance * thresholdDistance;
}

const particleView2D = new ParticleView2D({ particleCount: swarmSize });
let particleField = new ParticleCloud(swarmSize);
const htmlDiv = document.getElementById("coralContainer");
const simulation = Simulation
    .in(htmlDiv)
    .with(new ThreeJsRenderer({ controls: false }))
    .withMouseClickEventListener()
    .withHud()
    .synchronize(particleField.alwaysWith(particleView2D))
    .onReset(resetSimulation)
    .onClockTick((clockTime, simulatedTime) => particleField.update());


function resetSimulation() {
    updateThreshold();
    particleField = new ParticleCloud(swarmSize);

    simulation.synchronize(particleField.alwaysWith(particleView2D))
    simulation.frameSceneOn(particleView2D, {
                padding: 0.5,
            viewDirection: new Vec3(0, 0, 1)
        });
}
resetSimulation();
particleView2D.showShapeSelectorIn(htmlDiv);
