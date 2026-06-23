import {
    Domain, StandardSurfaceView, Interval, MultivariateFunctionSurface, Simulation, Button
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

const membrane = new Membrane();
const surfaceView = new StandardSurfaceView({
    normalizer: new Interval(-membrane.amplitude, membrane.amplitude)
});

Simulation
    .with({
        htmlDivId: "membraneContainer"
    })
    .synchronize(membrane.alwaysWith(surfaceView))
    .incrementsTimeBy(0.016)
    .onClockTick((clock) => membrane.time = clock.simulatedTime, 3)
    .frameSceneOn(surfaceView, {
        padding: 0.7,
        translationY: -1.25
    })
    .append(surfaceView.controls())
    .append(surfaceView.surfaceLayoutSelector)
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
    .start();
