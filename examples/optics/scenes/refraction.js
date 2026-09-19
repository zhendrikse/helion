import {
    Block, Box, Checkbox, degToRad, LineSegment, LineSegmentView,
    RadialSymmetricBody, Range, Simulation, Slider, Sphere, Trail, Vec3, Vec2, wavelengthColor, Colour
} from "../../../src/index.js";

import {MeshBasicMaterial} from "three";

class RayBundle {
    constructor({
        rayCount = 6,
        n1 = 1.0,
        n2 = 1.5,
        c = 1.0,
        initialAngle = 45,
        initialRange = 1
    } = {}) {
        this._c = c;
        this._v1 = c / n1;
        this._v2 = c / n2;
        this._mediumThickness = 5 * initialRange;
        this._rayRadius = 1e-3 * this._mediumThickness;
        this._raySpacing = 100 * this._rayRadius;
        this._rayCount = Math.max(1, Math.min(10, rayCount));
        this._rays = [];

        for (let i = 0; i < this._rayCount; i++)
            this._rays.push(new RadialSymmetricBody({
                radius: this._rayRadius,
                mass: 1
            }));

        this.initialize(initialAngle);
    }

    /** @returns {ArrayIterator<RadialSymmetricBody>} */
    [Symbol.iterator]() {
        return this._rays[Symbol.iterator]();
    }

    /** @returns {ArrayIterator<[number, RadialSymmetricBody]>} */
    entries() {
        return this._rays.entries();
    }

    rayShifts(angle) {
        const first = -Math.floor((this._rayCount - 1) / 2);
        const last = Math.floor(this._rayCount / 2);

        const shifts = [];
        for (let i = first; i <= last; i++)
            shifts.push(new Vec2(-Math.sin(angle), Math.cos(angle)).multiplyScalar(i * this._raySpacing));

        return shifts;
    }

    initialize(angleInDegrees) {
        const angle = degToRad(angleInDegrees);
        const shifts = this.rayShifts(angle);

        let rayXMaxIndex = 0;
        let rayXMax = -this._mediumThickness;

        this._rays.forEach((ray, i) => {
            ray.position.copy(new Vec2(-Math.cos(angle), -Math.sin(angle))
                .multiplyScalar(this._mediumThickness))
                .add(shifts[i]);

            ray.velocity.set(this._v1 * Math.cos(angle), this._v1 * Math.sin(angle));

            if (ray.position.x > rayXMax) {
                rayXMax = ray.position.x;
                rayXMaxIndex = i;
            }
        });

        return rayXMaxIndex;
    }

    advance(angleInDegrees, dt) {
        const angle = degToRad(angleInDegrees);
        const direction = new Vec2(Math.cos(angle), Math.sin(angle));
        for (const ray of this._rays) {
            if (ray.position.x >= 0)
                ray.velocity.copy(direction).multiplyScalar(this._v2);

            ray.position.addScaledVector(ray.velocity, dt);
        }
    }

    positionOfRay(index) {
        return this._rays[index].position;
    }
}

const INITIAL_RANGE = 1;
const LAMBDA_RED = 750;
const LAMBDA_BLUE = 380;
const INITIAL_ANGLE = 45;
const INITIAL_RATE = 500;
const N1 = 1.0;
const N2 = 1.5;
const C = 1;

const MEDIUM_FACTOR = 5;
const MEDIUM_THICKNESS = MEDIUM_FACTOR * INITIAL_RANGE;
const RAY_RADIUS = 1e-3 * MEDIUM_THICKNESS;
const RAY_SHIFT = 100 * RAY_RADIUS;

const rays = new RayBundle({
    rayCount: 6,
    n1: N1,
    n2: N2,
    c: C,
    initialAngle: INITIAL_ANGLE,
    initialRange: INITIAL_RANGE
});

const medium = new Block({
    position: new Vec3(0.5 * MEDIUM_THICKNESS, 0, -0.25 * MEDIUM_THICKNESS),
    size: new Vec3(MEDIUM_THICKNESS, MEDIUM_THICKNESS, 0.1 * MEDIUM_THICKNESS),
    fixed: true
});

/** @type {Sphere[]} */
const rayViews = [];
/** @type {Trail[]} */
const trails = [];
for (const ray of rays) {
    const rayView = new Sphere({
        material: new MeshBasicMaterial({color: 0xffffff}),
        segments: 16
    });

    const trail = new Trail({
        maxPoints: 1000,
        trailStep: 1,
        color: Colour.fromHex(0xffffff)
    });

    rayViews.push(rayView);
    trails.push(trail);
}

const wavefrontColor = new Colour();
const wavefront = new LineSegment(new Vec2(), new Vec2());
const wavefrontView = new LineSegmentView({
    colorMapper: {
        map: (_value, targetColor) => wavefrontColor.asThreeJsColor(targetColor)
    }
});

const wavelengthSlider = new Slider("Wavelength")
    .withRange(new Range(LAMBDA_BLUE, LAMBDA_RED, 1))
    .withValue(550)
    .onInput(event => updateLightColor(false, Number(event.target.value)));

let incidentAngle = INITIAL_ANGLE;
let animationRate = INITIAL_RATE;
let ang2 = 0;

const simulation = Simulation
    .with({
        htmlDivId: "refractionRaysAndWavefrontContainer",
        camera: {
            position: new Vec3(0, 0, 10),
            orthographic: true,
            controls: false
        },
        viewport: { aspectRatio: "2 / 1" },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        parameterMenuCollapsed: false,
        infoPanel: {
            text: "<strong>🌈 Refraction</strong><br/>" +
                "Rays and wavefronts at a boundary between two media."
        }
    })
    .bind(medium.alwaysWith(new Box({
        color: Colour.fromHex(0xc0c0ff),
        opacity: 0.35
    })))
    .bind(wavefront.alwaysWith(wavefrontView))
    .onStep((_, dt) => {
        rays.advance(ang2, dt);
        wavefront.from.copy(rays.positionOfRay(0));
        wavefront.to.copy(rays.positionOfRay(5));
    })
    .appendStartStopResetUI()
    .append(new Slider("Incident angle")
        .withValue(INITIAL_ANGLE)
        .withRange(new Range(-89, 89, 1))
        .onInput(event => {
            incidentAngle = Number(event.target.value);
            initializeRays();
        }))
    .append(new Slider("Animation speed")
        .withValue(INITIAL_RATE)
        .withRange(new Range(0, INITIAL_RATE * 5, 1))
        .onInput(event => {
            animationRate = Number(event.target.value);
            simulation.atSpeed(animationRate / INITIAL_RATE);
        }))
    .append(wavelengthSlider)
    .append(new Checkbox("White")
        .checked(0)
        .onChange(() => updateLightColor(true)))
    .append(new Checkbox("Wavefront")
        .checked(true)
        .on(wavefrontView)
        .withProperty("visible"))
    .onReset(() => {
        incidentAngle = INITIAL_ANGLE;
        initializeRays();
    });

for (const [index, ray] of rays.entries()) {
    simulation.bind(ray.alwaysWith(rayViews[index]));
    simulation.bind(ray.alwaysWith(trails[index]));
}

function initializeRays(angle = incidentAngle) {
    const angleRad = degToRad(angle);
    ang2 = Math.asin((N1 / N2) * Math.sin(angleRad));
    rays.initialize(angle);
    wavefront.from.copy(rays.positionOfRay(0));
    wavefront.to.copy(rays.positionOfRay(5));
    for (const trail of trails)
        trail.reset();
}
initializeRays();

const color = new Colour();
function updateLightColor(isWhite, wavelength = 550) {
    wavelengthColor(wavelength, color);
    const colour = isWhite ? Colour.fromHex(0xffffff) : color;
    rayViews.forEach(view => view.color = colour);
    trails.forEach(trail => trail.color = colour);
    wavefrontColor.copy(colour);
}
updateLightColor(false);
