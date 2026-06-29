import {
    ThreeJsRenderer, Simulation, StandardSurfaceView, Vec3, DropdownMenu, Checkbox,
    Interval, Complex, MultivariateFunctionSurface, Domain, Registry, ComplexSurface
} from "../../../src/index.js";

const pi = Math.PI;
const exp = Math.exp;
const sin = Math.sin;
const sqrt = Math.sqrt;

const rSquared = (x, y) => x * x + y * y;
const modulation = (t) => (1 - sin(pi * (t - 0.5)));

const surfaces = {
    "zCubed": {
        "surface": new ComplexSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            z: (c) => c.multiply(c).multiply(c).add(new Complex(0, 2))
        })
    }
};

const surfacesRegistry = new Registry({
    id: "complexSurfaceSelect",
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
        this._simulation.bind(this._currentSurface.onceWith(surfaceView));
        this._simulation.provideAxesAround(surfaceView);
        this._simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5 * amplitude});
    }

    set animate(value) { this._animate = value; }

    set time(time) {
        if (this._animate)
            this._currentSurface.time = time;
    }
}

const container = document.getElementById("realSurfacesContainer");
const renderer = new ThreeJsRenderer({
    cameraPosition: new Vec3(25, 10, 10).multiplyScalar(1.6),
    fieldOfView: 20
});

const surfaceView = new StandardSurfaceView({
    normalizer: new Interval(0, surfaces["zCubed"].amplitude)
});

const simulation = Simulation
    .in(container)
    .with(renderer)
    .runsEvery(0.016);

const surfaceController = new SurfaceController(simulation, surfaceView);
simulation
    .onClockTick((clock) => surfaceController.time = clock.simulatedTime)
    .start();

new DropdownMenu(container)
    .for(surfacesRegistry)
    .addEventListener("change", event => surfaceController.changeSurface(event.target.value));
surfaceController.changeSurface("zCubed");
surfaceView.showColormapSelectorIn(container);
surfaceView.showSurfaceControlsIn(container);
surfaceView.showScalarFieldSelectorIn(container);
new Checkbox(container)
    .on(surfaceController)
    .withLabel("Animate surface ")
    .withProperty("animate");