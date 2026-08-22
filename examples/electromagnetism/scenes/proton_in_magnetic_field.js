import { Color } from "three";
import {
    RadialSymmetricBody, LorentzForce, Range, Simulation, Slider, Sphere, ArrowField, Trail, Vec3, VectorField
} from "../../../src/index.js";

//
// Physics
//
class DemoMagneticField extends VectorField {
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

const magneticField = new DemoMagneticField(.2);
const lorentzForce = LorentzForce.in(magneticField);

//
// View
//
const sphere = new Sphere({ color: 0xff0000 });
const arrowField = new ArrowField({
    xRange: new Range(-6, 6, .5),
    yRange: new Range(0, 0, .5),
    zRange: new Range(-6, 6, .5),
    scaleFactor: .9,
    round: true,
    magnitudeMap: (magnitude) => .5 * Math.sqrt(magnitude),
    colorMap: (axis, magnitude) => new Color().setHSL(.5 * Math.sqrt(magnitude), 1, 0.5)
});

const speedToVelocity = (speed, direction) => direction.clone().normalize().multiplyScalar(speed);
Simulation
    .with({
        htmlDivId: "protonInFieldContainer",
        camera: {
            position: new Vec3(0, 5, -10)
        },
        viewport: {
            aspectRatio: "19/12"
        }
    })
    .withMouseClickEventListener()
    .bind(magneticField.onceWith(arrowField))
    .bind(proton.alwaysWith(sphere))
    .bind(proton.alwaysWith(new Trail({ maxPoints: 300, color: sphere.color })))
    .runsEvery(1e-3)
    .substeps(5)
    .onStep((_, dt) => {
        proton
            .apply(lorentzForce)
            .integrate(dt);
    })
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
