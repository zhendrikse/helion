import { Color } from "three";
import { Particle, AxialSymmetricBody, VectorField, Range, Simulation, Canvas,
	Overlay, EventController, HtmlDiv, Sphere, Cylinder, ArrowField, Vec3,
	ThreeJsRenderer, ThreeJsRenderOptions, Trail
} from "../../../src/index.js";

//
// Constants
//
const Q = 1.6e-19;
const K = 9e9;

class ChargedRing {
    constructor({
                    radius = 0.5e-10,
                    segments = 60,
                    charge = Q
                } = {}) {
        this.radius = radius;
        this.charge = charge;
        this._segments = [];
        const points = this._createSegmentPositions(segments);
        this._createSegments(segments, points, charge);
    }

    _createSegments(segments, points, charge) {
        for (let i = 0; i < segments; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const axis = p2.clone().sub(p1);
            this._segments.push(new AxialSymmetricBody({
                position: p1.clone().add(p2).multiplyScalar(0.5),
                axis,
                radius: radius * 2.51e-2,
                charge: charge / segments
            }));
        }
    }

    _createSegmentPositions(segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const theta = i * 2 * Math.PI / segments;
            points.push(new Vec3(radius * Math.cos(theta), radius * Math.sin(theta), 0));
        }
        return points;
    }

    fieldAt(position) {
        const field = new Vec3();

        for (const segment of this._segments) {
            const r = segment.position.clone().sub(position);
            const r2 = r.lengthSq();
            if (r2 < 3e-23) // Cut off arrows that are too close to the ring, i.e. that are too big!
                continue;

            field.add(r.normalize().multiplyScalar(K * segment.charge / r2));
        }

        return field;
    }

    get segments() { return this._segments; }
}

//
// Physics
//
class RingElectricField extends VectorField {
    constructor(ring) {
        super();
        this._ring = ring;
        this._strength = 1;
    }

    vectorAt(position) {
        return this._ring.fieldAt(position).multiplyScalar(this._strength);
    }

    set strength(value) { this._strength = value; }
}

const radius = 0.5e-10;
const ring = new ChargedRing({ radius, segments: 60 });
const electricField = new RingElectricField(ring);
const electron = new Particle({
    position: new Vec3(
        (Math.random() - 0.5) * radius * 3,
        (Math.random() - 0.5) * radius * 3,
        radius + (Math.random() - 0.5) * radius * 3
    ),
    velocity: new Vec3(),
    mass: 9.1093837e-31,
    charge: Q,
    radius: radius / 20
});

function timeStep(dt) {
    const field = electricField.vectorAt(electron.position);
    const force = field.clone().multiplyScalar(electron.charge);
    electron.apply(force, dt);
}

//
// View model
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(15, 5, 20),
    fieldOfView: 22,
    scale: 5e10
});
const canvas= Canvas.withElementId("chargedRingCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv
        .withElementId("chargedRingWrapper")
        .containsBoth(canvas.and(Overlay.withElementId("chargedRingOverlay"))))
    .with(threeJsRendererOptions);

// Ring rendering
for (const segment of ring.segments)
    renderer.synchronize(segment.onceWith(new Cylinder({ color: "orange" })));

// Electron + trail rendering
const electronSphere = new Sphere({ color: "red"});
renderer.synchronize(electron.alwaysWith(electronSphere));
renderer.synchronize(electron.alwaysWith(new Trail({
    maxPoints: 150,
    color: electronSphere.color
})));

// Field visualization
renderer.synchronize(electricField.onceWith(new ArrowField({
    xRange: new Range(-radius * 1.5, radius * 1.5, radius / 4),
    yRange: new Range(-radius * 1.5, radius * 1.5, radius / 4),
    zRange: new Range(-radius * 1.5, radius * 1.5, radius / 6),
    scaleFactor: 2.5e-16,
    magnitudeMap: magnitude => Math.sqrt(1 + 1e-3 * magnitude),
    colorMap: (axis, magnitude) => {
        const radial = axis.clone().normalize();
        const t = Math.min(Math.sqrt(1 + magnitude) * 1.25e-6, 1);
        return radial.z > 0
            ? new Color().setHSL(0.0,  1, -0.5 * t + 1)
            : new Color().setHSL(0.66, 1, -0.5 * t + 1);
    },
    // colorMap: (axis, magnitude) => new Color().setHSL(Math.min(Math.sqrt(1 + magnitude) * 5e-7, 1), 1, 0.5),
    round: true
})));

// Run simulation
const dt = 2e-19;
const subSteps = 20;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => timeStep(dt), subSteps);

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);

