import {
    Canvas, EventController, HtmlControl, HtmlDiv, GradientColorMapper, Domain,
    StandardSurfaceView, Interval, colorMappers, MultivariateFunctionSurface,
    Simulation, ThreeJsRenderer, ThreeJsRenderOptions
} from "../../../src/index.js";

const PI = Math.PI;
const cos = Math.cos;

class Membrane extends MultivariateFunctionSurface {
    constructor({
        omega = Math.PI / 2,
        normalModeX = 1,
        normalModeY = 1,
        amplitude = .5,
        domain = new Domain([-PI / 2, PI / 2], [-PI / 2, PI / 2])
    } = {}) {
        super({domain});
        this._amplitude = amplitude;
        this._normalModeX = normalModeX;
        this._normalModeY = normalModeY;
        this._z = (x, y, t) => this._amplitude *
            cos(omega * t) * cos(x * this._normalModeX) * cos(y * this._normalModeY);
    }

    get amplitude() { return this._amplitude; }
    set normalModeX(normalModeX) { this._normalModeX = normalModeX; }
    set normalModeY(normalModeY) { this._normalModeY = normalModeY; }
}

class MembraneController {
    constructor(surfaceView) {
        this._surfaceView = surfaceView;
    }

    set colorMapper(colorMapper) { this._surfaceView.colorMapper = colorMappers[colorMapper]; }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("membraneCanvasWrapper").contains(Canvas.withElementId("membraneCanvas")))
    .with(new ThreeJsRenderOptions());

const membrane = new Membrane();
const surfaceView = new StandardSurfaceView({
    normalizer: new Interval(-membrane.amplitude, membrane.amplitude),
    colorMapper: new GradientColorMapper()
});

renderer.frameSceneOn(surfaceView, {padding: 2, translationY: -1.25});

const simulation = Simulation
    .with(renderer)
    .synchronize(membrane.alwaysWith(surfaceView))
    .incrementsTimeBy(0.016)
    .onClockTick((clockTime, simulatedTime) => membrane.time =simulatedTime, 3)
    .start();

const eventController = EventController.for(simulation);
const membraneController = new MembraneController(surfaceView);
eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(membraneController)
    .withProperty("colorMapper"));

eventController.attach(HtmlControl
    .withElementId("showContours")
    .forType("click")
    .to(surfaceView)
    .withProperty("contoursVisible"));

for (let i = 1; i < 6; i++) {
    eventController.attach(HtmlControl
        .withElementId("x" + i)
        .forType("click")
        .to(membrane)
        .withProperty("normalModeX"));

    eventController.attach(HtmlControl
        .withElementId("y" + i)
        .forType("click")
        .to(membrane)
        .withProperty("normalModeY"));
}
