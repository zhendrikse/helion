import { Color, AmbientLight, PointLight } from "three";
import { Particle, EC , VectorField, Range, Simulation, Canvas, Overlay, HtmlDiv,
    EventController, HtmlControl, CallbackFunction, Sphere, ArrowField,
    ThreeJsRenderOptions, ThreeJsRenderer, Trail, Vec3 } from "helion";

const K = 9e9;
const scale = 1e14;

class Capacitor {
    constructor(topY = 10e-14, bottomY = -10e-14) {
        this.charges = [];

        for (let x = -20; x <= 20; x += 2)
            for (let z = -20; z <= 20; z += 2)
                for (const y of [topY, bottomY])
                    this.charges.push(new Particle({
                        position: new Vec3(x / scale, y, z / scale),
                        radius: 1e-14,
                        charge: EC * (y > 0 ? 1 : -1)
                    }));
    }

    fieldAt(position, out=new Vec3()) {
        out.set(0, 0, 0);
        for (const charge of this.charges)
            out.add(charge.fieldAt(position).multiplyScalar(K));

        return out;
    }
}

class CapacitorField extends VectorField {
    constructor(capacitor) {
        super();
        this._capacitor = capacitor;
    }

    vectorAt(position) { return this._capacitor.fieldAt(position); }
}

//
// Physics objects
//
const capacitor = new Capacitor();
const capacitorField = new CapacitorField(capacitor);
const movingCharge = new Particle({
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
const threeJsRendererOptions = new ThreeJsRenderOptions({
    light: false, // setting our own lights
    cameraPosition: new Vec3(-50, 0, 75).multiplyScalar(0.5),
    fieldOfView: 60,
    scale: scale
});
const renderer = ThreeJsRenderer.on(
    HtmlDiv.withElementId("movingChargeWrapper").containsBoth(canvas.and(overlay)))
    .with(threeJsRendererOptions);

const dirLight = new PointLight(0xffffff, 2e3);
dirLight.position.set(0, 0, 0);
renderer.addObject3D(dirLight);
renderer.addObject3D(new AmbientLight(0xffffff, 0.8));

for (const charge of capacitor.charges) {
    const sphere = new Sphere({
        color: charge.charge > 0 ? new Color(0x4444ff) : new Color(0xff0000)
    });
    renderer.synchronize(charge.onceWith(sphere)); // Prevent unnecessary updates!
}

const sphere = new Sphere({ color: new Color(0x44ff44)});
renderer.synchronize(movingCharge.alwaysWith(sphere));
renderer.synchronize(movingCharge.alwaysWith(new Trail({ maxPoints: 400, color: sphere.color })));

const arrowField = new ArrowField({
    xRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    yRange: new Range(-9 / scale, 9 / scale, 4 / scale),
    zRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    scaleFactor: 1e-15,
    round: false,
    magnitudeMap: magnitude => Math.log(1 + magnitude),
    colorMap: (axis, magnitude) => new Color(1, Math.sqrt(magnitude) * 1e-10, 0)
});
renderer.synchronize(capacitorField.onceWith(arrowField));

const dt = 0.01;
const subSteps = 3;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick(() => {
        if (movingCharge.position.x > 60 / scale)
            return;

        const field = capacitor.fieldAt(movingCharge.position)
        const force = field.multiplyScalar(movingCharge.charge);
        movingCharge.apply(force, dt);
    }, subSteps);

//
// Event listeners
//
const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);

const chargeCallback = new CallbackFunction((event) =>
    movingCharge.charge = event.target.value * 5e-42 * EC);
eventController.add(chargeCallback
    .to(HtmlControl.withElementId("chargeSlider")
        .forType("input")
        .withValueSpanId("chargeSliderValue")));

const speedCallback = new CallbackFunction((event) =>
    movingCharge.velocity.x = event.target.value / scale);
eventController.add(speedCallback
    .to(HtmlControl.withElementId("speedSlider")
        .forType("input")
        .withValueSpanId("speedSliderValue")));
