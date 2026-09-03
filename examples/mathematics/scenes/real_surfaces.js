import {
    Simulation, DropdownMenu, Checkbox, Interval, MultivariateFunction, Domain, Registry,
    SurfaceVisualization, FixedIntervalNormalizer, SurfaceResolution, ContoursLayer, ScalarFieldSurface
} from "../../../src/index.js";

const pi = Math.PI;
const exp = Math.exp;
const sin = Math.sin;
const sqrt = Math.sqrt;

const rSquared = (x, y) => x * x + y * y;
const modulation = (t) => (1 - sin(pi * (t - 0.5)));

const functions = {
    "Monkey saddle": {
        "function": new MultivariateFunction({
            domain: new Domain([-1, 1], [-1, 1]),
            func: (x, y, t) => .3 * (x * x * x - 3 * y * y * x) * modulation(t)
        }),
        "latex": "x^3 - 3xy^2"
    },
    "Ripple": {
        "function": new MultivariateFunction({
            domain: new Domain([-pi, pi], [-pi, pi]),
            func: (x, y, t) => sin(1.25 * rSquared(x, y) - pi * t)
        }),
        "latex": "\\sin(x^2 + y^2)"
    },
    "Peak": {
        "function": new MultivariateFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: (x, y, t) => 2 * exp(-rSquared(x, y)) * modulation(t)
        }),
        "latex": "\\exp(-x^2 - y^2)"
    },
    "Ricker": {
        "function": new MultivariateFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: (x, y, t) => 2 * (1 - rSquared(x, y)) * exp(-1 * rSquared(x, y)) * modulation(t)
        }),
        "latex": "(1 - (x^2 + y^2)\\exp(-(x^2 + y^2))"
    },
    "Polynomial": {
        "function": new MultivariateFunction({
            domain: new Domain([-.55, .55], [-.55, .55]),
            func: (x, y, t) => (x * x * x - y * y * y) * modulation(t)
        }),
        "latex": "x^3 - y^3"
    },
    "Wavelet": {
        "function": new MultivariateFunction({
            domain: new Domain([-.3, .3], [-.3, .3]),
            func: (x, y, t) => .25 * (sin(4 * sqrt(x * x + y * y) / sqrt(x * x + y * y + .01) - pi * t))
        }),
        "latex": "\\dfrac{\\sin(\\sqrt{x^2 + y^2})}{\\sqrt{x^2 + y^2}}"
    }
};

const functionsRegistry = new Registry({
    label: "🌫️ Function ",
    entries: functions
});

class SurfaceController {
    constructor(simulation) {
        this._simulation = simulation;
        this._function = functionsRegistry.get("Monkey saddle").function;
        this._currentSurface = new ScalarFieldSurface(this._function);
        this._animate = false;
    }

    changeSurface(surfaceId) {
        this._function = functionsRegistry.get(surfaceId).function;
        this._currentSurface = new ScalarFieldSurface(this._function);
        this._simulation.bind(this._currentSurface.alwaysWith(surfaceView));
        this._simulation.provideAxesAround(surfaceView);
        this._simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -1 });
        this._simulation.setLatexTitle("\\Large{f(x,y) = " + functionsRegistry.get(surfaceId).latex + "}");
    }

    set animate(value) { this._animate = value; }

    set time(time) {
        if (this._animate)
            this._function.time = time;
    }
}

const contoursLayer = new ContoursLayer({
});
const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(200, 200)
}
).addOverlayLayer(contoursLayer);

const simulation = Simulation
    .with({
        htmlDivId: "realSurfacesContainer",
        headUpDisplay: {
            enabled: false
        },
        camera: {
            fieldOfView: 20
        }
    })
    .runsEvery(0.016);

const surfaceController = new SurfaceController(simulation);
simulation
    .onStep((clock, _) => surfaceController.time = clock.simulatedTime)
    .append(new DropdownMenu()
        .for(functionsRegistry)
        .addEventListener("change", event => surfaceController.changeSurface(event.target.value))
    )
    .append(surfaceView.ui())
    .append(new Checkbox("Animate surface ")
        .on(surfaceController)
        .withProperty("animate"))
    .start();

surfaceController.changeSurface("Monkey saddle");
