import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl, HeightFieldSurface,
    ScalarField, EventController, IsoparametricContoursView, PlaneSurfaceView, Vec3,
    FixedIntervalNormalizer, HeightScalarField, Interval, NormalizedScalarField
} from "helion";

class MultiVariateFunction extends ScalarField {
    constructor({
        amplitude = 2
    } = {}) {
        super();
        this._amplitude = amplitude;
        this._time = 0;
        this._animate = false;
    }

    updateWith(newTime) {
        if (this._animate)
            this._time = newTime;
    }

    scalarValueAt(x, y) {
        return this.f(x, y, this._time);
    }

    f(x, y, t) {
        throw new Error("Implement f(x, y, t)!")
    }

    get amplitude() { return this._amplitude; }
    set animate(value) { this._animate = value; }
}

class Ripple extends MultiVariateFunction {
    constructor() {
        super({ amplitude: 2 });
    }

    f(x, y, t) {
        const r = Math.sqrt(x * x + y * y);
        return this._amplitude * Math.sin(Math.PI * r - Math.PI * t);
    }
}

class Peak extends MultiVariateFunction {
    constructor() {
        super({ amplitude: 5 });
    }

    f(x, y, t) {
        const r2 = -x * x - y * y;
        return this._amplitude * Math.exp(.25 * r2) * (1 - Math.sin(Math.PI * t - Math.PI * 0.5));
    }
}

//
// Math objects
//
const scalarField = new Ripple();
const heightFieldSurface = new HeightFieldSurface({
    field: scalarField
});

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("realSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("realSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(25, 10, 10).multiplyScalar(1.6),
        fieldOfView: 20
    }));

//
// Surface view
//
const surfaceScalarField = new NormalizedScalarField(
    new HeightScalarField(), new FixedIntervalNormalizer(new Interval(-scalarField.amplitude, scalarField.amplitude)));

const surfaceView = new PlaneSurfaceView({
    uSegments: 100,
    vSegments: 100,
    scalarField: surfaceScalarField
});
const contoursView = new IsoparametricContoursView({
    uSegments: 20,
    vSegments: 20,
    scalarField: surfaceScalarField
});

renderer.synchronize(heightFieldSurface.alwaysWith(surfaceView));
renderer.synchronize(heightFieldSurface.alwaysWith(contoursView));

renderer.provideAxesAround(surfaceView.boundingBox);
renderer.frameSceneOn(surfaceView.boundingBox, {padding: 0.9, translationY: -5});

//
// Simulation
//
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016)
    .onClockTick((clockTime, simulatedTime) => scalarField.updateWith(simulatedTime), 1)
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
    .withElementId("animate")
    .forType("click")
    .to(scalarField)
    .withProperty("animate"));

eventController.attach(HtmlControl
    .withElementId("showWireframe")
    .forType("click")
    .to(surfaceView)
    .withProperty("wireframe"));