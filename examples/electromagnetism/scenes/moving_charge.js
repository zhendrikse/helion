import { Color, AmbientLight, PointLight } from "three";
import {
    RadialSymmetricBody, EC, VectorField, Range, Simulation, Trail, Vec3, Slider,
    EventController, Sphere, ArrowField, ThreeJsRenderer
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
const container = document.getElementById("movingChargeContainer");
const renderer = ThreeJsRenderer
    .in(container)
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

const chargeCallback = (event) => {
    movingCharge.state.charge = Number(event.target.value) * 5e-42 * EC;
}
const chargeSlider = new Slider(container)
    .withLabel("🪫 Charge: ")
    .withUnits(" electron charge(s)")
    .withValue(1)
    .withRange(new Range(0, 5, .1))
    .addEventListener(chargeCallback);

const speedCallback = (event) => movingCharge.state.velocity.x = event.target.value / scale;
const speedSlider = new Slider(container)
    .withLabel("🚀 Speed: ")
    .withUnits(" x 1E-14 m/s")
    .withValue(25)
    .withRange(new Range(1, 50, 1))
    .addEventListener(speedCallback);

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
    }, subSteps)
    .onReset(() => {
        movingCharge.state.charge = Number(chargeSlider.value) * 5e-42 * EC;
        movingCharge.state.velocity.x = Number(speedSlider.value) / scale;
    })

for (const charge of capacitor.charges) {
    const sphere = new Sphere({
        color: charge.charge > 0 ? new Color(0x4444ff) : new Color(0xff0000)
    });
    simulation.synchronize(charge.onceWith(sphere)); // Prevent unnecessary updates!
}

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListener();
