import {
    Circle, Simulation, Vec3, Vec2, DropdownMenu, ColorMappers, Colour, ColorMapper,
    ModelsCollection, ViewsCollection, RadialSymmetricBody
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

const thresholdDistance = 7;
const thresholdDistanceSquared = thresholdDistance * thresholdDistance;
const noise = 10;
const verticalDrift = 1.5;

class CoralParticleView extends Circle {
    constructor({ colorFunction, colorMapper } = {}) {
        super({ segments: 16 });
        this._colorFunction = colorFunction;
        this._colorMapper = colorMapper;
        this._color = new Colour();
    }

    /** @param {ColorMapper} mapper */
    set colorMapper(mapper) { this._colorMapper = mapper; }

    synchronizeWith(particle) {
        super.synchronizeWith(particle);
        const value = this._colorFunction(particle);
        this._colorMapper.map(value, this._color);
        this._color.asThreeJsColor(this._fillMaterial.color);
    }
}

class ParticleCloud {
    /** @param {number} N */
    constructor(N) {
        this._count = N;
        this._seeds = new ModelsCollection();
        this._seedPosition = new Vec2(width * 0.5, 2);
        this._initialize();
    }

    get seeds() { return this._seeds; }

    _initialize() {
        for (let i = 0; i < this._count; i++) {
            const pos = new Vec2(width * Math.random(), height * Math.random());
            const particle = new RadialSymmetricBody({ position: pos, radius: 3, fixed: false });
            this._seeds.add(particle);
        }

        // First particle is the seed at top center
        const seed = this._seeds.bindableAt(0);
        seed.fixed = true;
        seed.position.copy(this._seedPosition);
    }

    reset() {
        this._seeds.forEach(particle => {
            particle.position.set(width * Math.random(), height * Math.random());
            particle.fixed = false;
        });
        const seed = this._seeds.bindableAt(0);
        seed.fixed = true;
        seed.position.copy(this._seedPosition);
    }

    update() {
        this._seeds.forEach(particle => {
            if (particle.fixed)
                return;

            const dx = Math.random() * noise;
            const dy = Math.random() * noise;
            particle.position.x += Math.random() < 0.5 ? dx : -dx;
            particle.position.y -= verticalDrift + (Math.random() < 0.5 ? dy : -dy);
            particle.position.x = (particle.position.x + width) % width;
            if (particle.position.y < 0) {
                particle.position.y = height;
                particle.position.x = width * Math.random();
            }

            this.checkForFreezing(particle);
        });
    }

/** @param {RadialSymmetricBody} particle */
    checkForFreezing(particle) {
        for (let i = 0; i < this._count; i++) {
            const other = this._seeds.bindableAt(i);
            if (!other.fixed)
                continue;

            if (particle.distanceToSquared(other) < thresholdDistanceSquared) {
                particle.fixed = true;
                return;
            }
        }
    }
}

/** @param {RadialSymmetricBody} particle */
const colorFunction = (particle) => {
    if (!particle.fixed)
        return normalize(0, 0, maxDistance);
    return normalize(1.75 * particle.position.distanceTo(particleCloud._seedPosition), 0, maxDistance);
};

const particleCloud = new ParticleCloud(swarmSize);
const particleCloudView = ViewsCollection.of(CoralParticleView).with({
    colorFunction,
    colorMapper: ColorMappers.get(ColorMappers.Scientific, { colorSpace: LinearSRGBColorSpace })
});

Simulation
    .with({
        htmlDivId: 'coralContainer',
        camera: { orthographic: true, controls: false }
    })
    .withMouseClickEventListener()
    .onReset(() => particleCloud.reset())
    .runsEvery(0.05)
    .onStep(() => particleCloud.update())
    .bind(particleCloud.seeds.alwaysWith(particleCloudView))
    .frameSceneOn(particleCloudView, {padding: 1})
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Scientific)
        .onChange(value => {
            const mapper = ColorMappers.get(value, { colorSpace: LinearSRGBColorSpace });
            particleCloud.forEach(binding => binding.view.colorMapper = mapper);
        }));

particleCloud.reset();
