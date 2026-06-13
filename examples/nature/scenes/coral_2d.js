import {
    DiscreteParticleField, ParticleView2D, Simulation, ThreeJsRenderer, Vec3
} from "../../../src/index.js";

const htmlDiv = document.getElementById("coralContainer");
let swarmSize = 1500;
const width = 500;
const height = 500;
let maxDistance = Math.sqrt(width * width + height * height);

// TODO Make color mapper for this
function scientificColorCodingFor(value, minVal, maxVal) {
    value = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    value = range === 0.0 ? 0.5 : (value - minVal) / range;
    const num = Math.floor(4 * value);
    const s = 4 * (value - num / 4);

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

class Particle {
    constructor() {
        this.x = width * Math.random();
        this.y = height * Math.random();
        this.radius = this.#computeParticleRadius();
        this.frozen = false;
        this.color = scientificColorCodingFor(0, 0, maxDistance);
    }

    #computeParticleRadius() {
        const dpr = window.devicePixelRatio || 1;
        return Math.max(1, 2 * dpr);
    }

    makeSeed() {
        this.frozen = true;
        this.x = width * .5;
        this.y = 2;
    }

    distanceSquaredTo(otherParticle) {
        const dx = this.x - otherParticle.x;
        const dy = this.y - otherParticle.y;
        return dx * dx + dy * dy;
    }

    distanceTo(otherParticle) {
        return Math.sqrt(this.distanceSquaredTo(otherParticle));
    }

    freeze() {
        this.frozen = true;
        this.color = scientificColorCodingFor(1.5 * this.distanceTo(particleField.particleAt(0)), 0, maxDistance);
    }

    hasCollisionWith(otherParticle) {
        if (!otherParticle.frozen)
            return false;

        return this.distanceSquaredTo(otherParticle) < thresholdDistanceSquared;
    }

    checkForFreezing() {
        for (let i = 0; i < swarmSize; i++)
            if(this.hasCollisionWith(particleField.particleAt(i))) {
                this.freeze();
                return;
            }
    }

    update() {
        if (this.frozen)
            return;

        const dx = Math.random() * noise;
        const dy = Math.random() * noise;
        this.x += Math.random() < 0.5 ? dx : -dx;
        this.y -= verticalDrift + (Math.random() < 0.5 ? dy : -dy);

        this.x = (this.x + width) % width;
        //this.y = (this.y + canvas2d.height) % canvas2d.height;
        if (this.y < 0) {
            this.y = height;
            this.x = width * Math.random();
        }

        this.checkForFreezing();
    }
}

const particleView2D = new ParticleView2D({ particleCount: swarmSize });
let particleField = new DiscreteParticleField();
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
    particleField = new DiscreteParticleField();
    for (let i = 0; i < swarmSize; i++)
        particleField.add(new Particle());
    particleField.particleAt(0).makeSeed();
    simulation.synchronize(particleField.alwaysWith(particleView2D))
    simulation.frameSceneOn(particleView2D, {
            padding: 0.5,
            viewDirection: new Vec3(0, 0, 1)
        });
}
resetSimulation();
particleView2D.showShapeSelectorIn(htmlDiv);
