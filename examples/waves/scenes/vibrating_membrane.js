import {
    Domain, Simulation, Button, SurfaceVisualization,
    ContoursLayer, RadioGroup, Checkbox, MultivariateFunction, ScalarFieldSurface
} from "../../../src/index.js";

const PI = Math.PI;
const cos = Math.cos;

class MembraneFunction extends MultivariateFunction {
    constructor({
        domain = new Domain([-PI / 2, PI / 2], [-PI / 2, PI / 2]),
        omega = 2 * Math.PI / 3,
        normalModeX = 1,
        normalModeY = 1,
        amplitude = .5
    } = {}) {
        super({ domain });
        this._amplitude = amplitude;
        this._normalModeX = normalModeX;
        this._normalModeY = normalModeY;
        this._func = (x, y, t) => this._amplitude *
            cos(omega * t) * cos(x * this._normalModeX) * cos(y * this._normalModeY);
    }
    get amplitude() { return this._amplitude; }
    set normalModeX(normalModeX) { this._normalModeX = Number(normalModeX); }
    set normalModeY(normalModeY) { this._normalModeY = normalModeY; }
}

const membraneFunction = new MembraneFunction();
const membrane = new ScalarFieldSurface(membraneFunction);

const contours = new ContoursLayer();
const surfaceView = new SurfaceVisualization().addOverlayLayer(contours);

Simulation
    .with({
        htmlDivId: "membraneContainer",
        viewport: {
            aspectRatio: "19/12"
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(membrane.alwaysWith(surfaceView))
    .runsEvery(0.016)
    .onStep((clock, _) => membraneFunction.time = clock.simulatedTime)
    .frameSceneOn(surfaceView, {
        padding: 0.65,
        translationY: -1.25
    })
    .append(new Button("Mode-x: ").on(membraneFunction).withProperty("normalModeX").withText(" 1 ")
        .togetherWith(new Button().on(membraneFunction).withProperty("normalModeX").withText(` 2 `)
            .togetherWith(new Button().on(membraneFunction).withProperty("normalModeX").withText(` 3 `)
                .togetherWith(new Button().on(membraneFunction).withProperty("normalModeX").withText(` 4 `)
                    .togetherWith(new Button().on(membraneFunction).withProperty("normalModeX").withText(` 5 `)))))
    )
    .append(new Button("Mode-y: ").on(membraneFunction).withProperty("normalModeY").withText(" 1 ")
        .togetherWith(new Button().on(membraneFunction).withProperty("normalModeY").withText(` 2 `)
            .togetherWith(new Button().on(membraneFunction).withProperty("normalModeY").withText(` 3 `)
                .togetherWith(new Button().on(membraneFunction).withProperty("normalModeY").withText(` 4 `)
                    .togetherWith(new Button().on(membraneFunction).withProperty("normalModeY").withText(` 5 `)))))
    )
    .append(surfaceView.ui())
    .append(new Checkbox("Contours ")
        .on(contours)
        .withProperty("visible")
        .checked(true)
        .togetherWith(surfaceView.surfaceLayer.ui()))
    .append(
        new RadioGroup()
            .add("Smooth", () => surfaceView.display(SurfaceVisualization.Display.Surface))
            .add("Glyphs", () => surfaceView.display(SurfaceVisualization.Display.Glyphs))
            .add("None", () => surfaceView.display(SurfaceVisualization.Display.None))
            .checked(0)
    )
    .append(surfaceView.glyphLayer.ui())
    .start();
