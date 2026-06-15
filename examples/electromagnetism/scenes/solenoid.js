import { Color } from "three"
import {
    AxialSymmetricBody, VectorField, Range, Simulation, Vec3, Cylinder, ArrowField, Slider, Checkbox
} from "../../../src/index.js";

const MU0 = 4 * Math.PI * 1e-7;
const CURRENT = 1e8;
const L = 40;

class Solenoid {
    constructor({
        radius = 10,
        segments = 500,
        turns = 10,
        direct = true
    } = {}) {
        this._segments = this._createSegments(radius, segments, turns, direct);
    }

    _createSegments(radius, totalSegments, turns, direct) {
        const points = Array.from({ length: totalSegments }, (_, i) =>
            new Vec3(
                L / 2 - i * L / totalSegments,
                radius * Math.cos(2 * Math.PI / totalSegments * turns * i),
                radius * Math.sin(2 * Math.PI / totalSegments * turns * i)
            ));

        const segments = [];
        for (let i = 0; i < totalSegments - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const position = p1.clone().add(p2).multiplyScalar(0.5);
            const axis = direct ? p2.clone().sub(p1) : p1.clone().sub(p2);
            segments.push(new AxialSymmetricBody({ position, axis, radius: 0.5 }));
        }

        return segments;
    }

    _contributionFrom(segment, position) {
        const r = position.clone().sub(segment.position);
        const r2 = r.lengthSq();

        return (r2 < 1e-6) ? new Vec3() : segment.axis.clone()
            .cross(r.clone().normalize())
            .multiplyScalar(MU0 * CURRENT / (4 * Math.PI) * segment.axis.length() / r2);
    }

    fieldAt(position) {
        const field = new Vec3();

        for (const segment of this._segments)
            field.add(this._contributionFrom(segment, position));

        return field;
    }

    get segments() { return this._segments; }
}

class SolenoidField extends VectorField {
    constructor(solenoid) {
        super();
        this._solenoid = solenoid;
        this._fieldStrength = 1;
    }

    sample(position, target) {
        target.copy(this._solenoid.fieldAt(position).multiplyScalar(this._fieldStrength));
    }

    set fieldStrength(value) { this._fieldStrength = value; }
}

//
// Physics model
//
const solenoid = new Solenoid({
    radius: 10,
    segments: 500,
    turns: 10
});
const magneticField = new SolenoidField(solenoid);

//
// View
//
const arrowField = new ArrowField({
    xRange: new Range(-20, 20, 4),
    yRange: new Range(-20, 20, 4),
    zRange: new Range(-20, 20, 4),
    scaleFactor: 1.25
});

const simulation = Simulation
    .inHtmlDiv("solenoidContainer")
    .with({
        cameraPosition: new Vec3(32, 16, 48).multiplyScalar(1.25),
        fieldOfView: 45
    })
    .synchronize(magneticField.onceWith(arrowField));

for (const segment of solenoid.segments)
    simulation.synchronize(segment.onceWith(new Cylinder({ color: new Color("yellow") })));

simulation.append(new Slider("️⚡ Field strength: ")
    .on(magneticField)
    .withProperty("fieldStrength")
    .withRange(new Range(0, 1, 0.01))
    .withValue(.5)
    .togetherWith(new Checkbox("↻ Rotate: ")
        .withProperty("autoRotate")
        .on(simulation)));