import {
    Circle, Simulation, Vec3, Vec2, DropdownMenu, ColorMappers, Bindable, Colour, ColorMapper
} from '../../../src/index.js';
import { LinearSRGBColorSpace } from 'three';

const swarmSize = 1500;
const width = 500;
const height = 500;
const maxDistance = Math.sqrt(width * width + height * height);

function normalize(value, minVal, maxVal) {
    const clampedValue = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    return range === 0.0 ? 0.5 : (clampedValue - minVal) / range;
}

export class ParticleCloud extends Bindable {
    static areColliding(position1, position2) {
        return position1.distanceSquaredTo(position2) < thresholdDistanceSquared;
    }

    /**  @param {number} N  */
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

// Per-particle wrapper zodat Circle (Renderable2D) kan binden.
class CoralParticle extends Bindable {
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

// CoralParticleView extends Circle with colorFunction/colorMapper support
class CoralParticleView extends Circle {
    /**
     * @param {{
     *   colorFunction: (particle: CoralParticle) => number,
     *   colorMapper: ColorMapper
     * }} param0
     */
    constructor({ colorFunction, colorMapper }) {
        super({ segments: 16 });
        this._colorFunction = colorFunction;
        this._colorMapper = colorMapper;
        this._color = new Colour();
    }

    set colorMapper(mapper) { this._colorMapper = mapper; }

    synchronizeWith(particle) {
        super.synchronizeWith(particle);
        const value = this._colorFunction(particle);
        this._colorMapper.map(value, this._color);
        this._color.asThreeJsColor(this._fillMaterial.color);
    }
}

const thresholdDistance = 7;
const thresholdDistanceSquared = thresholdDistance * thresholdDistance;
const noise = 10;
const verticalDrift = 1.5;
const particleField = new ParticleCloud(swarmSize);

const colorFunction = (particle) => {
    if (!particle.frozen)
        return normalize(0, 0, maxDistance);
    return normalize(1.75 * particle.position.distanceTo(particleField._positions[0]), 0, maxDistance);
};

/** @type {CoralParticleView[]} */
const particleViews = [];

const simulation = Simulation
    .with({
        htmlDivId: 'coralContainer',
        camera: {
            position: new Vec3(0, 0, width),
            orthographic: true
        }
    })
    .withMouseClickEventListener()
    .onReset(() => particleField.reset())
    .runsEvery(0.05)
    .onStep(() => particleField.update())
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Scientific)
        .onChange(value => {
            const mapper = ColorMappers.get(value, {colorSpace: LinearSRGBColorSpace});
            particleViews.forEach(view => view.colorMapper = mapper);
        }));

const colorMapper = new ColorMappers().get(ColorMappers.Scientific, {colorSpace: LinearSRGBColorSpace})();
for (let i = 0; i < swarmSize; i++) {
    const view = new CoralParticleView({ colorFunction, colorMapper });
    view._fillMesh.position.set(-width / 2, -height / 2, 0);
    view._borderMesh.position.set(-width / 2, -height / 2, 0);
    particleViews.push(view);
    simulation.bind(new CoralParticle(particleField, i).alwaysWith(view));
}

particleField.reset();
