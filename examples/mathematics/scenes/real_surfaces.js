import {
    ThreeJsRenderer, Canvas, HtmlDiv, Simulation, HtmlControl,
    EventController, StandardSurfaceView, Vec3,
    Interval, GradientColorMapper, MultivariateFunctionSurface, Domain, Registry, DropdownMenu, Checkbox,
} from "../../../src/index.js";

const pi = Math.PI;
const exp = Math.exp;
const sin = Math.sin;
const sqrt = Math.sqrt;

const rSquared = (x, y) => x * x + y * y;
const modulation = (t) => (1 - sin(pi * (t - 0.5)));

const surfaces = {
    "Ripple": {
        "amplitude": 1,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-pi, pi], [-pi, pi]),
            z: (x, y, t) => surfaces["Ripple"].amplitude * sin(1.25 * rSquared(x, y) - pi * t)
        })
    },
    "Monkey saddle": {
        "amplitude": 0.3,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-1, 1], [-1, 1]),
            z: (x, y, t) => surfaces["Monkey saddle"].amplitude *
                (x * x * x - 3 * y * y * x) * modulation(t)
        }),
    },
    "Peak": {
        "amplitude": 7.5,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-2 * pi, 2 * pi], [-2 * pi, 2 * pi]),
            z: (x, y, t) => surfaces["Peak"].amplitude *
                exp(-rSquared(x, y) / 4) * modulation(t)
        }),
    },
    "Ricker": {
        "amplitude": 2,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            z: (x, y, t) => surfaces["Ricker"].amplitude *
                (1 - rSquared(x, y)) * exp(-1 * rSquared(x, y)) * modulation(t)
        }),
    },
    "Polynomial": {
        "amplitude": .1,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-.55, .55], [-.55, .55]),
            z: (x, y, t) => (x * x * x - y * y * y) * modulation(t)
        })
    },
    "Wavelet": {
        "amplitude": .15,
        "surface": new MultivariateFunctionSurface({
            domain: new Domain([-.3, .3], [-.3, .3]),
            z: (x, y, t) => surfaces["Wavelet"].amplitude + surfaces["Wavelet"].amplitude *
                (sin(4 * sqrt(x * x + y * y) / sqrt(x * x + y * y + .01) - pi * t))
        })
    }
};

const surfacesRegistry = new Registry({
    id: "realSurfaceSelect",
    label: "Surface: ",
    entries: surfaces
});

class SurfaceController {
    constructor(simulation, surfaceView) {
        this._simulation = simulation;
        this._surfaceView = surfaceView;
        this._currentSurface = surfacesRegistry.get("Ripple").surface;
        this._animate = false;
    }

    changeSurface(surfaceId) {
        this._currentSurface = surfacesRegistry.get(surfaceId).surface;
        const amplitude = surfacesRegistry.get(surfaceId).amplitude;
        this._surfaceView.normalizer = new Interval(0, amplitude);
        this._surfaceView.dispose();
        this._simulation.synchronize(this._currentSurface.onceWith(surfaceView));
        this._simulation.renderer.provideAxesAround(surfaceView);
        this._simulation.renderer.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5 * amplitude});
    }

    set animate(value) { this._animate = value; }

    set time(time) {
        if (this._animate)
            this._currentSurface.time = time;
    }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("realSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("realSurfacesCanvas")))
    .with({
        cameraPosition: new Vec3(25, 10, 10).multiplyScalar(1.6),
        fieldOfView: 20
    });

const surfaceView = new StandardSurfaceView({
    colorMapper: new GradientColorMapper(),
    normalizer: new Interval(0, surfaces["Ripple"].amplitude)
});

const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016);

const surfaceController = new SurfaceController(simulation, surfaceView);
simulation
    .onClockTick((clockTime, simulatedTime) => surfaceController.time = simulatedTime)
    .start();

new DropdownMenu()
    .for(surfacesRegistry)
    .addEventListener("change", event => surfaceController.changeSurface(event.target.value));
surfaceController.changeSurface("Ripple");
surfaceView.showColormapSelector();
surfaceView.showSurfaceControls();
surfaceView.showScalarFieldSelector();
new Checkbox()
    .on(surfaceController)
    .withLabel("Animate surface ")
    .withProperty("animate");