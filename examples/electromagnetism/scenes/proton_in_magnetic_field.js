import { Color } from "three";
import { RadialSymmetricBody, VectorField, Range, Simulation, Canvas, Overlay, HtmlDiv,
    EventController, HtmlControl, CallbackFunction, Sphere, ArrowField,
    ThreeJsRenderOptions, ThreeJsRenderer, Trail, Vec3
} from "../../../src/index.js";

class MagneticField extends VectorField {
    constructor(fieldStrength) {
        super();
        this._strength = fieldStrength;
    }
    
    set magnitude(newValue) { this._strength = newValue; }

    vectorAt(position) {
        const yComponent = Math.sqrt(position.x * position.x + position.z * position.z);
        // b_z = 5 if (abs(abs(position.x)-1) < 0.2 and abs(abs(position.y)-1) < 0.2) else 0
        return new Vec3(0, yComponent, 0).multiplyScalar(this._strength);
    }
}

//
// Physics
//
const proton = new RadialSymmetricBody({
    position: new Vec3(0, 1, 0),
    velocity: new Vec3(.5, 0, 0),
    mass: 1,
    radius: .125,
    charge: 1
});

const magneticField = new MagneticField(.2);

function timeStep(dt) {
    const fieldVector = magneticField.vectorAt(proton.position);
    const force = fieldVector.cross(proton.velocity).multiplyScalar(proton.charge);
    proton.apply(force, dt);
}

//
// Simulation
//
const canvas = Canvas.withElementId("protonInFieldCanvas");
const overlay = Overlay.withElementId("protonInFieldOverlayText");
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(0, 5, -10)
});
const renderer = ThreeJsRenderer.on(
    HtmlDiv.withElementId("protonInFieldWrapper").containsBoth(canvas.and(overlay)))
    .with(threeJsRendererOptions);

const sphere = new Sphere({ color: new Color("red")});
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
const simulation = Simulation
    .with(renderer)
    .synchronize(magneticField.onceWith(arrowField))
    .synchronize(proton.alwaysWith(sphere))
    .synchronize(proton.alwaysWith(new Trail({ maxPoints: 300, color: sphere.color })))
    .incrementsTimeBy(dt)
    .onClockTick(() => timeStep(dt), subSteps);

//
// Event listeners
//
const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);

eventController.attach(HtmlControl
    .withElementId("protonInFieldStrengthSlider")
    .forType("input")
    .withValueSpanId("protonInFieldStrengthSliderValue")
    .to(magneticField)
    .withProperty("magnitude"));

const speedToVelocity = (speed, direction) => direction.clone().normalize().multiplyScalar(speed);
const speedCallback = new CallbackFunction((event) =>
    proton.state.velocity.copy(speedToVelocity(event.target.value * .01, proton.velocity)));
eventController.add(speedCallback
    .to(HtmlControl.withElementId("protonInFieldSpeedSlider")
        .forType("input")
        .withValueSpanId("protonInFieldSpeedSliderValue")));

