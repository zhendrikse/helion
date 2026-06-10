import {
    GradientColorMapper, Domain, StandardSurfaceView, Interval,
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

const container = document.getElementById("membraneContainer");
const renderer = ThreeJsRenderer
    .in(container)
    .with({});

const membrane = new Membrane();
const surfaceView = new StandardSurfaceView({
    normalizer: new Interval(-membrane.amplitude, membrane.amplitude),
    colorMapper: new GradientColorMapper()
});

renderer.frameSceneOn(surfaceView, { padding: 1.75, translationY: -1.25 });

Simulation
    .with(renderer)
    .synchronize(membrane.alwaysWith(surfaceView))
    .incrementsTimeBy(0.016)
    .onClockTick((clockTime, simulatedTime) => membrane.time = simulatedTime, 3)
    .start();

surfaceView.showColormapSelectorIn(container);
surfaceView.showSurfaceControlsIn(container);

const normalModeXButton = new Button(container)
    .on(membrane)
    .withProperty("normalModeX")
    .withText(" 1 ")
    .withLabel("Mode-x: ");
for (let i = 2; i < 6; i++)
    Button.togetherWith(normalModeXButton)
        .on(membrane)
        .withProperty("normalModeX")
        .withText(` ${i} `);

const normalModeYButton = new Button(container)
    .on(membrane)
    .withProperty("normalModeY")
    .withText(" 1 ")
    .withLabel("Mode-y: ");
for (let i = 2; i < 6; i++)
    Button.togetherWith(normalModeYButton)
        .on(membrane)
        .withProperty("normalModeY")
        .withText(` ${i} `)
