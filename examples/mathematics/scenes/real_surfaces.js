import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    EventController, StandardSurfaceView, Vec3,
    Interval, GradientColorMapper, MultivariateFunctionSurface, Domain,
    colorMappers, scalarFields
} from "../../../src/index.js";

const pi = Math.PI;
const exp = Math.exp;
const sin = Math.sin;
const rSquared = (x, y) => x * x + y * y;

class SurfaceController {
    static surfaces = {
        "Peak": {
            "amplitude": 7.5,
            "surface": new MultivariateFunctionSurface({
                domain: new Domain([-2 * pi, 2 * pi], [-2 * pi, 2 * pi]),
                z: (x, y, t) => SurfaceController.surfaces["Peak"].amplitude *
                    exp(-rSquared(x, y) / 4) * (1 - sin(pi * (t - 0.5)))
            }),
        },
        "Ricker": {
            "amplitude": 3,
            "surface": new MultivariateFunctionSurface({
                domain: new Domain([-2, 2], [-2, 2]),
                z: (x, y, t) => SurfaceController.surfaces["Peak"].amplitude *
                    (1 - rSquared(x, y)) * exp(-2 * rSquared(x, y)) * (1 - sin(pi * (t - 0.5)))
            }),
        },
        "Ripple": {
            "amplitude": 1,
            "surface": new MultivariateFunctionSurface({
                domain: new Domain([-pi, pi], [-pi, pi]),
                z: (x, y, t) => SurfaceController.surfaces["Ripple"].amplitude *
                    sin(1.25 * rSquared(x, y) - pi * t)
            })
        }
    };

    constructor(simulation, surfaceView, options = {
        padding: 0.9,
        translationY: -5
    }) {
        this._simulation = simulation;
        this._surfaceView = surfaceView;
        this._options = options;
        this._currentSurface = null;
        this._animate = true;
    }

    get surface() { return this._currentSurface; }
    set surface(surfaceName) { this.switchTo(surfaceName); }
    set colorMapper(colorMapper) { this._surfaceView.colorMapper = colorMappers[colorMapper]; }
    set scalarField(scalarField) { this._surfaceView.scalarField = scalarFields[scalarField]; }

    set time(time) {
        if (this._animate)
            this._currentSurface.time = time;
    }
    set animate(value) { this._animate = value; }

    switchTo(surfaceName) {
        const newSurface = SurfaceController.surfaces[surfaceName].surface;
        const amplitude = SurfaceController.surfaces[surfaceName].amplitude;
        if (!newSurface) throw new Error(`Surface "${surfaceName}" not found`);

        if (this._currentSurface)
            this._surfaceView.dispose();

        this._currentSurface = newSurface;
        this._surfaceView.normalizer = new Interval(0, amplitude);

        this._simulation.synchronize(newSurface.alwaysWith(this._surfaceView));
        this._simulation.renderer.provideAxesAround(this._surfaceView);
        this._simulation.renderer.frameSceneOn(this._surfaceView, this._options);
    }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("realSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("realSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(25, 10, 10).multiplyScalar(1.6),
        fieldOfView: 20
    }));

const surfaceView = new StandardSurfaceView({
    colorMapper: new GradientColorMapper(),
    normalizer: new Interval(0, SurfaceController.surfaces["Peak"].amplitude)
});

const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016);

const surfaceController = new SurfaceController(simulation, surfaceView);

simulation
    .onClockTick((clockTime, simulatedTime) => surfaceController.time = simulatedTime)
    .start();

// Initial surface
surfaceController.switchTo("Ripple");

const eventController = EventController.for(simulation);
eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(surfaceController)
    .withProperty("colorMapper"));

eventController.attach(HtmlControl
    .withElementId("showContours")
    .forType("click")
    .to(surfaceView)
    .withProperty("contoursVisible"));

eventController.attach(HtmlControl
    .withElementId("animate")
    .forType("click")
    .to(surfaceController)
    .withProperty("animate"));

eventController.attach(HtmlControl
    .withElementId("showWireframe")
    .forType("click")
    .to(surfaceView)
    .withProperty("wireframe"));

eventController.attach(HtmlControl
    .withElementId("surfaceSelect")
    .forType("change")
    .to(surfaceController)
    .withProperty("surface"));
