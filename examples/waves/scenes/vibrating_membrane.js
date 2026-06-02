import {
    Canvas, HeightScalarField, EventController, ScalarFieldSurface, HtmlControl, HtmlDiv,
    IsoparametricContoursView, Interval, FixedIntervalNormalizer,
    PlaneSurfaceView, ScalarField, Simulation, ThreeJsRenderer, ThreeJsRenderOptions, Vec3, GradientColorMapper
} from "../../../src/index.js";

const gridSize = 15;

class MembraneScalarField extends ScalarField {
    constructor({
        omega = Math.PI / 2,
        amplitude = 2,
        size = gridSize,
    } = {}) {
        super();
        this._omega = omega;
        this._amplitude = amplitude;
        this._waveCountX = 1 / size;
        this._waveCountY = 1 / size;
        this._time = 0;
        this._size = size
    }

    get amplitude() { return this._amplitude; }
    set waveCountX(waveCountX) { this._waveCountX = waveCountX / this._size; }
    set waveCountY(waveCountY) { this._waveCountY = waveCountY / this._size; }

    updateWith(time) { this._time = time; }

    scalarValueAt(x, y) {
        return this._amplitude *  Math.cos(this._omega * this._time) *
            Math.cos(Math.PI * x * this._waveCountX) *
            Math.cos(Math.PI * y * this._waveCountY);
    }
}

//
// Math objects
//
const scalarField = new MembraneScalarField();
const heightFieldSurface = new ScalarFieldSurface({
    scalarField,
    uRange: new Interval(-0.5 * gridSize, 0.5 * gridSize),
    vRange: new Interval(-0.5 * gridSize, 0.5 * gridSize)
})

//
// Surface view
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("membraneCanvasWrapper").contains(Canvas.withElementId("membraneCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(0, 10, 17),
        fieldOfView: 45,
    }));

const surfaceView = new PlaneSurfaceView({
    normalizer: new FixedIntervalNormalizer(new Interval(-scalarField.amplitude, scalarField.amplitude)),
    colorMapper: new GradientColorMapper()
});
const contoursView = new IsoparametricContoursView({
    uSegments: 20,
    vSegments: 20,
    normalizer: new FixedIntervalNormalizer(new Interval(-scalarField.amplitude, scalarField.amplitude)),
    colorMapper: new GradientColorMapper()
});
renderer.synchronize(heightFieldSurface.alwaysWith(surfaceView));
renderer.synchronize(heightFieldSurface.alwaysWith(contoursView));

//
// Simulation
//
const dt = 0.016;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => scalarField.updateWith(simulatedTime), 3)
    .start();

const eventController = EventController.for(simulation);
eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(contoursView)
    .withProperty("colorMapper"));

eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(surfaceView)
    .withProperty("colorMapper"));

eventController.attach(HtmlControl
    .withElementId("showContours")
    .forType("click")
    .to(contoursView)
    .withProperty("visible"));

eventController.attach(HtmlControl
    .withElementId("showWireframe")
    .forType("click")
    .to(surfaceView)
    .withProperty("wireframe"));

for (let i = 1; i < 6; i++) {
    eventController.attach(HtmlControl
        .withElementId("x" + i)
        .forType("click")
        .to(scalarField)
        .withProperty("waveCountX"));

    eventController.attach(HtmlControl
        .withElementId("y" + i)
        .forType("click")
        .to(scalarField)
        .withProperty("waveCountY"));
}
