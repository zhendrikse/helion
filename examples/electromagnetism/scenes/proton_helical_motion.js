import { Color } from "three";
import {
    VectorField, Range, Sphere, Trail, Vec3, ArrowField, ThreeJsRenderer,
    Slider, Simulation, Aquarium, RadialSymmetricBody
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

    sample(position, target) { target.copy(this._field.clone().multiplyScalar(this._fieldStrength)); }
    get fieldStrength() { return this._fieldStrength; }
    set fieldStrength(strength) { this._fieldStrength = strength; }
}

const magneticField = new UniformMagneticField();
const proton = new RadialSymmetricBody({
    position: new Vec3(0, -boxSize, boxSize * .5),
    velocity: new Vec3(initialSspeed * Math.cos(angle), initialSspeed * Math.sin(angle), 0),
    mass: 1,
    charge: 0.8,
    radius: 1.5
});

const outOfBox = (pos) => pos.y > boxSize || pos.x < -boxSize || pos.x > boxSize || pos.z < -boxSize || pos.z > boxSize;
const field = new Vec3();
function timeStep(dt) {
    if (outOfBox(proton.position))
        return;

    // Lorentz force: F = q v × B
    magneticField.sample(proton.position, field);
    const force = proton.velocity.clone()
        .cross(field)
        .multiplyScalar(proton.charge);

    proton.apply(force, dt);
}

//
// View
//
const container = document.getElementById("helicalProtonContainer");
const renderer = new ThreeJsRenderer({
    cameraPosition: new Vec3(7, 4, 4.5).multiplyScalar(25),
    fieldOfView: 30
});

const protonSphere = new Sphere({ color: 0xff0000 });
const arrowField = new ArrowField({
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
});

const dt = 5e-4;
Simulation
    .in(container)
    .with(renderer)
    .withHud()
    .withMouseClickEventListener()
    .synchronize(proton.alwaysWith(protonSphere))
    .synchronize(proton.alwaysWith(new Trail({ maxPoints: 2000, color: protonSphere.color })))
    .synchronize(magneticField.onceWith(arrowField))
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => timeStep(dt), 25);

renderer.add(new Aquarium({
    color: 0x1e90ff,
    opacity: 0.1,
    size: new Vec3(boxSize, boxSize, boxSize).multiplyScalar(2.1),
    frameColor: 0x779977
}));

new Slider(container)
    .withRange(new Range(.25, 5, .1))
    .on(proton.state)
    .withValue(0.8)
    .withProperty("charge")
    .withLabel("🪫 Charge: ");

new Slider(container)
    .withRange(new Range(.5, 5, .1))
    .on(magneticField)
    .withValue(1)
    .withProperty("fieldStrength")
    .withLabel("🧲 Field: ");

const speedToVelocity = (speed, direction) => direction.clone().normalize().multiplyScalar(speed);
const speedCallback = event => proton.state.velocity = speedToVelocity(event.target.value, proton.velocity);
new Slider(container)
    .withRange(new Range(1, 100, 1))
    .withValue(50)
    .withLabel("🚀 Speed: ")
    .addEventListener(speedCallback);

