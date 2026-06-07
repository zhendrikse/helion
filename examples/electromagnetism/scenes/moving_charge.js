import { Color, AmbientLight, PointLight } from "three";
import {
    RadialSymmetricBody, EC, VectorField, Range, Simulation, Canvas, Overlay,
    EventController, HtmlControl, CallbackFunction, Sphere, ArrowField,
    ThreeJsRenderer, Trail, Vec3, HtmlDiv
} from "../../../src/index.js";

const K = 9e9;
const scale = 1e14;

class Capacitor {
    constructor(topY = 10e-14, bottomY = -10e-14) {
        this.charges = [];

        for (let x = -20; x <= 20; x += 2)
            for (let z = -20; z <= 20; z += 2)
                for (const y of [topY, bottomY])
                    this.charges.push(new RadialSymmetricBody({
                        position: new Vec3(x / scale, y, z / scale),
                        radius: 1e-14,
                        charge: EC * (y > 0 ? 1 : -1)
                    }));
    }

    fieldAt(position, target) {
        target.set(0, 0, 0);
        for (const charge of this.charges)
            target.add(charge.fieldAt(position).multiplyScalar(K));
    }
}

class CapacitorField extends VectorField {
    constructor(capacitor) {
        super();
        this._capacitor = capacitor;
    }

    sample(positionVector, target) { this._capacitor.fieldAt(positionVector, target); }
}

//
// Physics objects
//
const capacitor = new Capacitor();
const capacitorField = new CapacitorField(capacitor);
const movingCharge = new RadialSymmetricBody({
    position: new Vec3(-30, 4, 0).divideScalar(scale),
    velocity: new Vec3(15, 0, 0).divideScalar(scale),
    mass: 1.6e-27,
    radius: 1.2e-14,
    charge: 5e-42 * EC
});

//
// Simulation
//
const canvas = Canvas.withElementId("movingChargeCanvas");
const overlay = Overlay.withElementId("movingChargeOverlayText");
const renderer = ThreeJsRenderer.on(
    HtmlDiv.withElementId("movingChargeWrapper").containsBoth(canvas.and(overlay)))
    .with({
        light: false, // setting our own lights
        cameraPosition: new Vec3(-50, 0, 75).multiplyScalar(0.5),
        fieldOfView: 60,
        scale: scale
    });

const dirLight = new PointLight(0xffffff, 2e3);
dirLight.position.set(0, 0, 0);
renderer.add(dirLight);
renderer.add(new AmbientLight(0xffffff, 0.8));

const sphere = new Sphere({ color: new Color(0x44ff44) });
const arrowField = new ArrowField({
    xRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    yRange: new Range(-9 / scale, 9 / scale, 4 / scale),
    zRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    scaleFactor: 1e-15,
    round: false,
    magnitudeMap: magnitude => Math.log(1 + magnitude),
    colorMap: (axis, magnitude) => new Color(1, Math.sqrt(magnitude) * 1e-10, 0)
});

const dt = 0.01;
const subSteps = 3;
const field = new Vec3();
const simulation = Simulation
    .with(renderer)
    .synchronize(movingCharge.alwaysWith(sphere))
    .synchronize(movingCharge.alwaysWith(new Trail({ maxPoints: 400, color: sphere.color })))
    .synchronize(capacitorField.onceWith(arrowField))
    .incrementsTimeBy(dt)
    .onClockTick(() => {
        if (movingCharge.position.x > 60 / scale)
            return;

        capacitorField.sample(movingCharge.position, field);
        const force = field.multiplyScalar(movingCharge.charge);
        movingCharge.apply(force, dt);
    }, subSteps);

for (const charge of capacitor.charges) {
    const sphere = new Sphere({
        color: charge.charge > 0 ? new Color(0x4444ff) : new Color(0xff0000)
    });
    simulation.synchronize(charge.onceWith(sphere)); // Prevent unnecessary updates!
}

//
// Event listeners
//
const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);

const chargeCallback = new CallbackFunction((event) => {
    movingCharge.state.charge = Number(event.target.value) * 5e-42 * EC
});
eventController.add(chargeCallback
    .to(HtmlControl.withElementId("chargeSlider")
        .forType("input")
        .withValueSpanId("chargeSliderValue")));

const speedCallback = new CallbackFunction((event) =>
    movingCharge.state.velocity.x = event.target.value / scale);
eventController.add(speedCallback
    .to(HtmlControl.withElementId("speedSlider")
        .forType("input")
        .withValueSpanId("speedSliderValue")));
