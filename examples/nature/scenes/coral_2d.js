import {
    ParticleCloudView, Simulation, ThreeJsRenderer, Vec3, DropdownMenu, ColorMappers, ColorMap
} from "../../../src/index.js";
import { MathPhysicsModelBehavior } from "../../../src/core/helion.js";
import { Color } from "three";

const swarmSize = 1500;
const width = 500;
const height = 500;
const maxDistance = Math.sqrt(width * width + height * height);

function normalize(value, minVal, maxVal) {
    const clampedValue = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    return range === 0.0 ? 0.5 : (clampedValue - minVal) / range;
}

let colorMapper = ColorMappers.get(ColorMap.Scientific);

export class ParticleCloud extends MathPhysicsModelBehavior {
    static areColliding(position1, position2) {
        return position1.distanceSquaredTo(position2) < thresholdDistanceSquared;
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
        const color = new Color();
        this._frozen[index] ?
            colorMapper.map(normalize(1.75 * this._positions[index].distanceTo(this._positions[0]), 0, maxDistance), color) :
            colorMapper.map(normalize(0, 0, maxDistance), color);

        return {
            position: this._positions[index],
            color: color,
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

const particleView2D = new ParticleCloudView({
    particleCount: swarmSize,
    scalarField: particle => particle.position.distanceTo(particleField.particleStateAt(0).position)
});

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
new DropdownMenu(htmlDiv).for(ColorMappers).addEventListener("change", (event) =>
    colorMapper = ColorMappers.get(event.target.value));

