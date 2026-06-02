import { Color } from "three";
import {
    Particle, VectorField, Range, Sphere, Trail, Vec3,
    ArrowField, ThreeJsRenderer, ThreeJsRenderOptions, CallbackFunction, Canvas,
    EventController, HtmlControl, HtmlDiv, Overlay, Simulation, Aquarium
} from "../../../src/index.js";

const initialSspeed = 50;
const angle = 10 * Math.PI / 180;
const boxSize = 40;

//
// Physics model
//
class UniformMagneticField extends VectorField {
    constructor(field = new Vec3(0, -5, 0), strength = 1) {
        super();
        this._field = field;
        this._fieldStrength = strength;
    }

    vectorAt(position) { return this._field.clone().multiplyScalar(this._fieldStrength); }
    get field() { return this._field; }
    get fieldStrength() { return this._fieldStrength; }
    set fieldStrength(strength) { this._fieldStrength = strength; }
}

const magneticField = new UniformMagneticField();
const proton = new Particle({
    position: new Vec3(0, -boxSize, boxSize * .5),
    velocity: new Vec3(initialSspeed * Math.cos(angle), initialSspeed * Math.sin(angle), 0),
    mass: 1,
    charge: 0.8,
    radius: 1.5
});

//
// View with renderer
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(7, 4, 4.5).multiplyScalar(25),
    fieldOfView: 30
});
const canvas= Canvas.withElementId("helicalProtonCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv
        .withElementId("helicalProtonCanvasWrapper")
        .containsBoth(canvas.and(Overlay.withElementId("helicalProtonCanvasOverlay"))))
    .with(threeJsRendererOptions);

const protonSphere = new Sphere({ color: 0xff0000 });
renderer.synchronize(proton.alwaysWith(protonSphere));
renderer.synchronize(proton.alwaysWith(new Trail({ maxPoints: 2000, color: protonSphere.color })));
renderer.synchronize(magneticField.alwaysWith(new ArrowField({
    xRange: new Range(-boxSize, boxSize, 10),
    yRange: new Range(-boxSize, boxSize, 10),
    zRange: new Range(-boxSize, boxSize, 10),
    scaleFactor: 3,
    magnitudeMap: m => .25 + Math.sqrt(m * .1),
    colorMap: (axis, m) => {
        const normalized = (m - 0.5) / (5 - 0.5);
        const hue = 0.65 - normalized * 0.55; // blue -> cyan -> green -> yellow
        return new Color().setHSL(hue, 1, 0.5);
    },
    round: true
})));
renderer.addObject3D(new Aquarium({
    color: 0x1e90ff,
    opacity: 0.1,
    size: new Vec3(boxSize, boxSize, boxSize).multiplyScalar(2.1),
    frameColor: 0x779977
}));

//
// Simulation
//
const dt = 5e-4;
const outOfBox= (pos) => pos.y > boxSize || pos.x < -boxSize || pos.x > boxSize || pos.z < -boxSize || pos.z > boxSize;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => timeStep(), 25);

function timeStep() {
    if (outOfBox(proton.position))
        return;

    // Lorentz force: F = q v × B
    const force = proton.velocity.clone()
        .cross(magneticField.vectorAt(proton.position))
        .multiplyScalar(proton.charge);

    proton.apply(force, dt);
}

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);

eventController.attach(HtmlControl
    .withElementId("helicalProtonChargeSlider")
    .forType("input")
    .to(proton)
    .withValueSpanId("helicalProtonChargeSliderValue")
    .withProperty("charge"));

eventController.attach(HtmlControl
    .withElementId("helicalProtonFieldStrengthSlider")
    .forType("input")
    .to(magneticField)
    .withValueSpanId("helicalProtonFieldStrengthSliderValue")
    .withProperty("fieldStrength"));

const speedToVelocity = (speed, direction) => direction.clone().normalize().multiplyScalar(speed);
const speedCallback = new CallbackFunction((event) =>
    proton.velocity = speedToVelocity(event.target.value, proton.velocity));
eventController.add(speedCallback
    .to(HtmlControl.withElementId("helicalProtonSpeedSlider")
        .forType("input")
        .withValueSpanId("helicalProtonSpeedSliderValue")));
