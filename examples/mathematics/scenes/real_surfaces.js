import {
    Simulation, DropdownMenu, Checkbox, Interval, MultivariateFunctionSurface, Domain, Registry,
    SurfaceVisualization, HeightLayer, FixedIntervalNormalizer, SurfaceLayer, SurfaceResolution, ContoursLayer
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
    constructor(simulation) {
        this._simulation = simulation;
        this._currentSurface = surfacesRegistry.get("Ripple").surface;
        this._animate = false;
    }

    changeSurface(surfaceId) {
        this._currentSurface = surfacesRegistry.get(surfaceId).surface;
        const amplitude = surfacesRegistry.get(surfaceId).amplitude;
        this._currentSurface.normalizer = new Interval(0, amplitude);
        this._simulation.bind(this._currentSurface.alwaysWith(surfaceView));
        this._simulation.provideAxesAround(surfaceView);
        this._simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5 * amplitude});
    }

    set animate(value) { this._animate = value; }

    set time(time) {
        if (this._animate)
            this._currentSurface.time = time;
    }
}

const normalizer = new FixedIntervalNormalizer(new Interval(0, surfaces["Ripple"].amplitude));
const contoursLayer = new ContoursLayer({
    normalizer: normalizer
});
const surfaceLayer = new SurfaceLayer({
    normalizer: normalizer,
    resolution: new SurfaceResolution(200, 200)
});
const surfaceView = new SurfaceVisualization(surfaceLayer).addOverlayLayer(contoursLayer);

const simulation = Simulation
    .with({
        htmlDivId: "realSurfacesContainer",
        fieldOfView: 20
    })
    .runsEvery(0.016);

const surfaceController = new SurfaceController(simulation);
simulation
    .onStep((clock, _) => surfaceController.time = clock.simulatedTime)
    .append(new DropdownMenu()
        .for(surfacesRegistry)
        .addEventListener("change", event => surfaceController.changeSurface(event.target.value))
    )
    .append(surfaceView.controls())
    .append(new Checkbox("Animate surface ")
        .on(surfaceController)
        .withProperty("animate"))
    .start();

surfaceController.changeSurface("Ripple");
