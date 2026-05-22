import { Color } from "three";
import { Particle, VectorField, Range , Simulation, Canvas, HtmlDiv, Vec3,
    EventController, HtmlControl, Sphere, ArrowField, ThreeJsRenderOptions,
    ThreeJsRenderer } from "helion";

const scale = 1e15;
const ec = 1.6e-19;

class Dipole {
    constructor(distance = 1.2e-14, charge = ec) {
        this.positive = new Particle({
            position: new Vec3(distance, 0, 0),
            radius: .1e-14,
            charge: +charge
        });
        this.negative = new Particle({
            position: new Vec3(-distance, 0, 0),
            radius: 1e-14 * 0.05,
            charge: -charge
        });
    }

    fieldAt(position) {
        return this.positive
            .fieldAt(position)
            .add(this.negative.fieldAt(position));
    }
}

class DipoleField extends VectorField {
    constructor(dipole) {
        super();

        this._dipole = dipole;
        this._fieldStrength = 0.25;
    }

    vectorAt(position) {
        return this._dipole
            .fieldAt(position)
            .multiplyScalar(this._fieldStrength);
    }

    set fieldStrength(value) { this._fieldStrength = value; }
}

//
//  Physics model
//
const dipole = new Dipole(1e-14);
const dipoleField = new DipoleField(dipole);

//
// View
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vec3(32, 16, 48).multiplyScalar(0.75),
    fieldOfView: 40
});

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("dipoleCanvasWrapper").contains(Canvas.withElementId("dipoleCanvas")))
    .with(threeJsRendererOptions);

const positiveSphere = new Sphere({ color: new Color("red") });
const negativeSphere = new Sphere({color: new Color("blue" )});
const arrowField = new ArrowField({
    xRange: new Range(-20 / scale, 20 / scale, 2 / scale),
    yRange: new Range(-12 / scale, 12 / scale, 2 / scale),
    zRange: new Range(-12 / scale, 12 / scale, 2 / scale),
    scaleFactor: 3e-5,
    round: true,
    magnitudeMap: magnitude => Math.sqrt(1 + magnitude),
    colorMap: (axis, magnitude) => new Color().setHSL(Math.min(Math.sqrt(1 + magnitude) * 5e-6, 1), 1, 0.5)
});

renderer.synchronize(dipole.positive.onceWith(positiveSphere));
renderer.synchronize(dipole.negative.onceWith(negativeSphere));
renderer.synchronize(dipoleField.alwaysWith(arrowField));

//
// Event controller
//
const eventController = new EventController();
eventController.attach(HtmlControl
    .withElementId("fieldStrengthSlider")
    .forType("input")
    .withValueSpanId("fieldStrengthSliderValue")
    .to(dipoleField)
    .withProperty("fieldStrength"));

eventController.attach(HtmlControl
    .withElementId("autoRotate")
    .forType("click")
    .to(renderer)
    .withProperty("autoRotate"));

Simulation
    .with(renderer)
    .onScale(scale)
    .onClockTick();

