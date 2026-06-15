import { Color } from "three";
import {
    RadialSymmetricBody, VectorField, Range, Simulation, Slider, Sphere, ArrowField, Trail, Vec3
} from "../../../src/index.js";

//
// Physics
//
class MagneticField extends VectorField {
    constructor(fieldStrength) {
        super();
        this._strength = fieldStrength;
    }

    set magnitude(newValue) { this._strength = newValue; }

    sample(position, target) {
        const yComponent = Math.sqrt(position.x * position.x + position.z * position.z);
        // b_z = 5 if (abs(abs(position.x)-1) < 0.2 and abs(abs(position.y)-1) < 0.2) else 0
        target.set(0, yComponent * this._strength, 0);
    }
}

const proton = new RadialSymmetricBody({
    position: new Vec3(0, 1, 0),
    velocity: new Vec3(.5, 0, 0),
    mass: 1,
    radius: .125,
    charge: 1
});

const magneticField = new MagneticField(.2);

const fieldVector = new Vec3();
function timeStep(dt) {
    magneticField.sample(proton.position, fieldVector);
    const force = fieldVector.cross(proton.velocity).multiplyScalar(proton.charge);
    proton.apply(force, dt);
}

//
// View
//
const sphere = new Sphere({ color: new Color("red") });
const arrowField = new ArrowField({
    xRange: new Range(-6, 6, .5),
    yRange: new Range(0, 0, .5),
    zRange: new Range(-6, 6, .5),
    scaleFactor: .9,
    round: true,
    magnitudeMap: (magnitude) => .5 * Math.sqrt(magnitude),
    colorMap: (axis, magnitude) => new Color().setHSL(.5 * Math.sqrt(magnitude), 1, 0.5)
});

const dt = 2.5e-3;
const subSteps = 100;
const speedToVelocity = (speed, direction) => direction.clone().normalize().multiplyScalar(speed);
Simulation
    .inHtmlDiv("protonInFieldContainer")
    .with({
        cameraPosition: new Vec3(0, 5, -10),
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .synchronize(magneticField.onceWith(arrowField))
    .synchronize(proton.alwaysWith(sphere))
    .synchronize(proton.alwaysWith(new Trail({ maxPoints: 300, color: sphere.color })))
    .incrementsTimeBy(dt)
    .onClockTick(() => timeStep(dt), subSteps)
    .append(new Slider("🧲 Field: ")
        .withRange(new Range(.1, 1, .01))
        .on(magneticField)
        .withValue(.2)
        .withProperty("magnitude")
    )
    .append(new Slider("🚀 Speed: ")
        .withRange(new Range(1, 100, 1))
        .withValue(50)
        .addEventListener("input", event =>
            proton.state.velocity.copy(speedToVelocity(event.target.value * .01, proton.velocity)))
    );
