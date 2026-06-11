import {
    Canvas2DRenderer, DiscreteParticleField, ParticleRaster, Simulation
} from "../../../src/index.js";

const htmlDiv = document.getElementById("coralContainer");
let maxDistance = 0;
const PARTICLES_PER_10K_PIXELS = 75;
let swarmSize = 0;

function resizeCanvasToWrapper() {
    const rectangle = htmlDiv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // canvas2d.htmlCanvas.width  = Math.floor(rectangle.width * dpr);
    // canvas2d.htmlCanvas.height = Math.floor(rectangle.height * dpr);
    //
    // canvas2d.htmlCanvas.style.width  = rectangle.width + "px";
    // canvas2d.htmlCanvas.style.height = rectangle.height + "px";
}

function scientificColorCodingFor(value, minVal, maxVal) {
    value = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    value = range === 0.0 ? 0.5 : (value - minVal) / range;
    const num = Math.floor(4 * value);
    const s = 4 * (value - num / 4);

    switch (num) {
        case 0 :
            return "rgba(0, " + 255 * s + ", 255, 255)";
        case 1 :
            return "rgba(0, 255, " + 255 * (1 - s) + ", 255)";
        case 2 :
            return "rgba(" + 255 * s + ", 255, 0, 255)";
        case 3 :
            return "rgba(255, " +  255 * (1 - s)  + ", 0, 255)";
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
        this.x = htmlDiv.width * Math.random();
        this.y = htmlDiv.height * Math.random();
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
        this.x = htmlDiv.width * .5;
        // this.y = canvas2d.height * .5;
        this.y = htmlDiv.height - 2;
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
        this.y += verticalDrift + (Math.random() < 0.5 ? dy : -dy);

        this.x = (this.x + htmlDiv.width) % htmlDiv.width;
        //this.y = (this.y + canvas2d.height) % canvas2d.height;
        if (this.y > htmlDiv.height) {
            this.y = 0;
            this.x = htmlDiv.width * Math.random();
        }

        this.checkForFreezing();
    }
}

function updateMaxDistance() {
    maxDistance = Math.sqrt(htmlDiv.width * htmlDiv.width + htmlDiv.height * htmlDiv.height);
}

function computeSwarmSize() {
    const cssWidth  = htmlDiv.width;
    const cssHeight = htmlDiv.height;
    const areaCSS = cssWidth * cssHeight;

    swarmSize = Math.floor(areaCSS / 10_000 * PARTICLES_PER_10K_PIXELS);
}

const particleField = new DiscreteParticleField();
function setup() {
    for (let i = 0; i < swarmSize; i++)
        particleField.add(new Particle());
    particleField.particleAt(0).makeSeed();
}

function resizeAndResetSimulation() {
    resizeCanvasToWrapper();
    updateMaxDistance();
    updateThreshold();
    computeSwarmSize();
    setup();
}

// window.addEventListener('resize', () => {
//     resizeAndResetSimulation();
// });
//
resizeAndResetSimulation();

//
// View for 2D canvas
//
const renderer2d = Canvas2DRenderer.in(htmlDiv);

const particleRaster = new ParticleRaster();

const simulation = Simulation
    .with(renderer2d)
    .synchronize(particleField.alwaysWith(particleRaster))
    .onClockTick((clockTime, simulatedTime) => {
        particleField.update();
    });
simulation.start()
