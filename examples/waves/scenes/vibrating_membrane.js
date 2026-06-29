import {
    Domain, MultivariateFunctionSurface, Simulation, Button, SurfaceVisualization, HeightLayer,
    FixedIntervalNormalizer, Interval, ContoursLayer, GlyphLayer, SurfaceLayer, Checkbox, RadioButton, RadioGroup
} from "../../../src/index.js";

const PI = Math.PI;
const cos = Math.cos;

class Membrane extends MultivariateFunctionSurface {
    constructor({
        omega = 2 * Math.PI / 3,
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

class MembraneNormalizer extends FixedIntervalNormalizer {
    update(amplitude) {
        this._interval.from = -amplitude;
        this._interval.to = amplitude;
    }
}

const membrane = new Membrane();
const membraneNormalizer = new MembraneNormalizer(
    new Interval(-membrane.amplitude, membrane.amplitude)
);

const surfaceLayer = new SurfaceLayer({
    colorLayer: new HeightLayer(),
    normalizer: membraneNormalizer
});
const glyphLayer = new GlyphLayer({
    glyphType: GlyphLayer.GlyphTypes.BOXES,
    colorLayer: new HeightLayer(),
    normalizer: membraneNormalizer
});
const contours = new ContoursLayer({
    colorLayer: new HeightLayer(),
    normalizer: membraneNormalizer
});

const surfaceView = new SurfaceVisualization(surfaceLayer).addOverlayLayer(contours);

Simulation
    .with({
        htmlDivId: "membraneContainer"
    })
    .synchronize(membrane.alwaysWith(surfaceView))
    .incrementsTimeBy(0.016)
    .onStep((clock, _) => {
        membraneNormalizer.update(membrane.amplitude);
        membrane.time = clock.simulatedTime;
    })
    .frameSceneOn(surfaceView, {
        padding: 0.7,
        translationY: -1.25
    })
    .append(new Button("Mode-x: ").on(membrane).withProperty("normalModeX").withText(" 1 ")
        .togetherWith(new Button().on(membrane).withProperty("normalModeX").withText(` 2 `)
            .togetherWith(new Button().on(membrane).withProperty("normalModeX").withText(` 3 `)
                .togetherWith(new Button().on(membrane).withProperty("normalModeX").withText(` 4 `)
                    .togetherWith(new Button().on(membrane).withProperty("normalModeX").withText(` 5 `)))))
    )
    .append(new Button("Mode-y: ").on(membrane).withProperty("normalModeY").withText(" 1 ")
        .togetherWith(new Button().on(membrane).withProperty("normalModeY").withText(` 2 `)
            .togetherWith(new Button().on(membrane).withProperty("normalModeY").withText(` 3 `)
                .togetherWith(new Button().on(membrane).withProperty("normalModeY").withText(` 4 `)
                    .togetherWith(new Button().on(membrane).withProperty("normalModeY").withText(` 5 `)))))
    )
    .append(surfaceView.controls())
    .append(
        new RadioGroup(
            new RadioButton("Smooth")
                .addEventListener("change", () => surfaceView.meshLayer = surfaceLayer),

            new RadioButton("Glyphs")
                .addEventListener("change", () => surfaceView.meshLayer = glyphLayer),

            new RadioButton("None")
                .addEventListener("change", () => surfaceView.meshLayer = null)
        ).checked(0)
    )
    .append(glyphLayer.controls())
    .append(new Checkbox("Contours ")
        .checked(true)
        .on(contours)
        .withProperty("visible")
        .togetherWith(new Checkbox("Wireframe ")
            .on(surfaceLayer)
            .withProperty("wireframe"))
    )
    .start();
