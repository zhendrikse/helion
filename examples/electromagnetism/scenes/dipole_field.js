import { Color } from "three";
import {
    RadialSymmetricBody, VectorField, Range, Simulation, Vec3, Slider,
    Sphere, ArrowField, Checkbox
} from "../../../src/index.js";

const scale = 1e15;
const ec = 1.6e-19;

class Dipole {
    constructor(distance = 1.2e-14, charge = ec) {
        this.positive = new RadialSymmetricBody({
            position: new Vec3(distance, 0, 0),
            radius: .1e-14,
            charge: +charge
        });
        this.negative = new RadialSymmetricBody({
            position: new Vec3(-distance, 0, 0),
            radius: 1e-14 * 0.05,
            charge: -charge
        });
    }

    fieldAt(position, out = new Vec3()) {
        out.copy(this.positive.fieldAt(position)
            .add(this.negative.fieldAt(position)));
    }
}

class DipoleField extends VectorField {
    constructor(dipole) {
        super();

        this._dipole = dipole;
        this._fieldStrength = 0.1;
    }

    sample(position, target) {
        this._dipole.fieldAt(position, target);
        target.multiplyScalar(this._fieldStrength);
    }

    set fieldStrength(value) {
        this._fieldStrength = Math.pow(10, value * 2 - 2);
    }
}

//
//  Physics model
//
const dipole = new Dipole(1e-14);
const dipoleField = new DipoleField(dipole);

//
// View
//
const positiveSphere = new Sphere({ color: "red" });
const negativeSphere = new Sphere({ color: "blue" });
const arrowField = new ArrowField({
    xRange: new Range(-20 / scale, 20 / scale, 2 / scale),
    yRange: new Range(-12 / scale, 12 / scale, 2 / scale),
    zRange: new Range(-12 / scale, 12 / scale, 2 / scale),
    round: true,
    magnitudeMap: m => Math.sqrt(1e-7 * m),
    scaleFactor: 1e-16,
    colorMap: (axis, magnitude) => new Color().setHSL(Math.min(Math.sqrt(1 + magnitude) * 5e-6, 1), 1, 0.5)
});

const container = document.getElementById("dipoleContainer");
Simulation
    .in(container)
    .with({
        cameraPosition: new Vec3(32, 16, 48),
        scale: scale,
        fieldOfView: 40
    })
    .synchronize(dipole.positive.onceWith(positiveSphere))
    .synchronize(dipole.negative.onceWith(negativeSphere))
    .synchronize(dipoleField.onceWith(arrowField))
    .start();

const slider = new Slider(container)
    .on(dipoleField)
    .withProperty("fieldStrength")
    .withRange(new Range(0, 1, 0.01))
    .withValue(.5)
    .withLabel("️⚡ Field strength: ");

let autoRotateTheta = Math.PI / 2;
let autoRotatePhi = 0;

function doAutoRotate(object) {
    autoRotateTheta += -Math.PI / (7.5 * 100);
    autoRotatePhi +=  Math.PI / (7.5 * 100) * 2;

    object.rotation.order = 'YXZ';

    object.rotation.y = -autoRotatePhi;
    object.rotation.x = -autoRotateTheta;
}

// TODO
// Checkbox.togetherWith(slider)
//     .withProperty("autoRotate")
//     .withLabel("↻ Rotate: ")
//     .addEventListener(() => doAutoRotate(arrowField));

