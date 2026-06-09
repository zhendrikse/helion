import {
    Canvas, HtmlDiv, GradientColorMapper, Domain, StandardSurfaceView, Interval,
    MultivariateFunctionSurface, Simulation, ThreeJsRenderer, Button
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
        super({ domain });
        this._amplitude = amplitude;
        this._normalModeX = normalModeX;
        this._normalModeY = normalModeY;
        this._z = (x, y, t) => this._amplitude *
            cos(omega * t) * cos(x * this._normalModeX) * cos(y * this._normalModeY);
    }

    get amplitude() { return this._amplitude; }
    set normalModeX(normalModeX) { this._normalModeX = Number(normalModeX); }
    set normalModeY(normalModeY) { this._normalModeY = normalModeY; }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("membraneCanvasWrapper").contains(Canvas.withElementId("membraneCanvas")))
    .with({});

const membrane = new Membrane();
const surfaceView = new StandardSurfaceView({
    normalizer: new Interval(-membrane.amplitude, membrane.amplitude),
    colorMapper: new GradientColorMapper()
});

renderer.frameSceneOn(surfaceView, { padding: 2, translationY: -1.25 });

Simulation
    .with(renderer)
    .synchronize(membrane.alwaysWith(surfaceView))
    .incrementsTimeBy(0.016)
    .onClockTick((clockTime, simulatedTime) => membrane.time = simulatedTime, 3)
    .start();

surfaceView.showColormapSelector();
surfaceView.showSurfaceControls();

const normalModeXButton = new Button()
    .on(membrane)
    .withText(" 1 ")
    .withLabel("Mode-x: ")
    .withProperty("normalModeX");
for (let i = 2; i < 6; i++)
    Button.togetherWith(normalModeXButton)
        .on(membrane)
        .withText(` ${i} `)
        .withProperty("normalModeX");

const normalModeYButton = new Button()
    .on(membrane)
    .withText(" 1 ")
    .withLabel("Mode-y: ")
    .withProperty("normalModeY");
for (let i = 2; i < 6; i++)
    Button.togetherWith(normalModeYButton)
        .on(membrane)
        .withText(` ${i} `)
        .withProperty("normalModeY");