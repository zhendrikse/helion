import { Color } from "three";

import {
    RadialSymmetricBody, VectorField, Range, Simulation, Canvas, Overlay, HtmlDiv,
    EventController, Sphere, ArrowField, ThreeJsRenderer, Vec3
} from "../../../src/index.js";

const Q = 1.6e-19;
const K = 9e9;
const C = 3e8;

let frequency = 8e16;
let amplitude = 1e-10;
function omega() { return 2 * Math.PI * frequency; }

class OscillatingCharge extends RadialSymmetricBody {
    constructor(charge) {
        super({ mass: 1, charge, radius: 0.25 * 1e-10 });
        this._sign = Math.sign(charge);
    }

    updateAt(time) {
        this.position.y = this._sign * amplitude * Math.sin(omega() * time);
        this.velocity.y = this._sign * amplitude * omega() * Math.cos(omega() * time);
        this.state.acceleration.set(0, -this._sign * amplitude * omega() * omega() * Math.sin(omega() * time), 0);
    }
}

//
// Liénard–Wiechert field
//
class ElectromagneticWaveField extends VectorField {
    constructor({
        source,
        electric = true
    }) {
        super();
        this._source = source;
        this._electric = electric;
        this.time = 0;

        this._velocityScratchVector = new Vec3();
        this._accelerationScratchVector = new Vec3();
    }

    sample(position, target) {
        const sourcePos = this._source.position;
        const r = position.clone().sub(sourcePos);
        const distance = r.length();

        if (distance < 4.5e-10)  // Cut off arrows too close to the charges, i.e. that are too big
            return new Vec3();

        // Retarded time
        const tRetarded = this.time - distance / C;

        // Source motion: position, velocity and acceleration
        //const y = this._source._sign * amplitude * Math.sin(omega() * tRetarded);
        const vy = this._source._sign * amplitude * omega() * Math.cos(omega() * tRetarded);
        const ay = -this._source._sign * amplitude * omega() * omega() * Math.sin(omega() * tRetarded);

        this._velocityScratchVector.set(0, vy, 0);
        this._accelerationScratchVector.set(0, ay, 0);

        const n = r.normalize();
        const beta = this._velocityScratchVector.multiplyScalar(1 / C);
        const beta2 = beta.lengthSq();
        const kappa = 1 - n.dot(beta);
        const kappa3 = kappa * kappa * kappa;

        // Velocity field
        const velocityTerm = n.clone().sub(beta)
            .multiplyScalar((1 - beta2) / (distance * distance * kappa3));

        // Radiation field
        const radiationTerm = n.clone().cross(n.clone().sub(beta)
            .cross(this._accelerationScratchVector.multiplyScalar(1 / C)))
            .multiplyScalar(1 / (C * distance * kappa3));

        const E = velocityTerm.add(radiationTerm).multiplyScalar(K * this._source.charge);
        if (this._electric)
            target.copy(E);
        else
            target.copy(n.cross(E).multiplyScalar(1 / C));
    }
}

const electron = new OscillatingCharge(-Q);
const proton = new OscillatingCharge(Q);

//
// Combined fields
//
class CombinedField extends VectorField {
    constructor(fields) {
        super();
        this._fields = fields;
        this._totalField = new Vec3();
    }

    sample(position, target) {
        this._totalField.set(0, 0, 0);
        const combinedField = new Vec3();
        for (const field of this._fields) {
            field.sample(position, combinedField);
            this._totalField.add(combinedField);
        }

        target.copy(this._totalField);
    }
}

const electricField = new CombinedField([
    new ElectromagneticWaveField({ source: electron, electric: true }),
    new ElectromagneticWaveField({ source: proton, electric: true })
]);

const magneticField = new CombinedField([
    new ElectromagneticWaveField({ source: electron, electric: false }),
    new ElectromagneticWaveField({ source: proton, electric: false })
]);

//
// Renderer
//
const canvas = Canvas.withElementId("electromagneticWaveCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv
        .withElementId("electromagneticWaveWrapper")
        .containsBoth(canvas.and(Overlay.withElementId("electromagneticWaveOverlay"))))
    .with({
        cameraPosition: new Vec3(15, 5, 20),
        fieldOfView: 45,
        scale: 1e10
    });

const electricArrowField = new ArrowField({
    xRange: new Range(-6e-10, 6e-10, 1.25e-10),
    yRange: new Range(-6e-10, 6e-10, 1.25e-10),
    zRange: new Range(-6e-10, 6e-10, 1.25e-10),
    scaleFactor: 2.5e-12,
    magnitudeMap: magnitude => Math.log(magnitude + 1),
    //colorMap: (axis, magnitude) => new Color().setHSL(0.15, 1, Math.min(Math.log(magnitude + 1), 0.6)),
    colorMap: (axis, magnitude) => new Color(0xbbbb55),
    round: true
});

const magneticArrowField = new ArrowField({
    xRange: new Range(-6e-10, 6e-10, 1.25e-10),
    yRange: new Range(-6e-10, 6e-10, 1.25e-10),
    zRange: new Range(-6e-10, 6e-10, 1.25e-10),
    scaleFactor: 2.5e-11,
    magnitudeMap: magnitude => Math.log(magnitude + 1),
    colorMap: () => new Color("cyan"),
    round: true
});

const dt = 2e-19;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .synchronize(electron.alwaysWith(new Sphere({ color: new Color("red") })))
    .synchronize(electricField.alwaysWith(electricArrowField))
    .synchronize(magneticField.alwaysWith(magneticArrowField))
    .synchronize(proton.alwaysWith(new Sphere({ color: new Color("yellow") })))
    .onClockTick((clockTime, simulatedTime) => {
        electron.updateAt(simulatedTime);
        proton.updateAt(simulatedTime);

        for (const field of electricField._fields)
            field.time = simulatedTime;

        for (const field of magneticField._fields)
            field.time = simulatedTime;
    }, 2);

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);
