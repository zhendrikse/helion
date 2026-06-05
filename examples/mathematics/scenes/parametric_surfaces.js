import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    EventController, Vec3, ParametricSurface, GaussianCurvatureField, scalarFields,
    colorMappers, Domain, StandardSurfaceView
} from "../../../src/index.js";

const sin = Math.sin;
const cos = Math.cos;
const PI = Math.PI;

class SurfaceController {
    static surfaces = {
        "Bow curve": new ParametricSurface({
            domain: new Domain([0, 2 * PI], [0, 4 * PI]),
            x: (u, v) => (1 * sin(u) + 2) * sin(v),
            y: (u, v) => (1 * sin(u) + 2) * cos(v),
            z: (u, v) => 1 * cos(u) + 2 * cos(0.5 * v)
        }),
        "Klein bottle": new ParametricSurface({
            domain: new Domain([0, 2 * PI], [0, 2 * PI]),
            x: (u, v) => -(5 - 2 * cos(u)) * cos(v) + 6 * (sin(u) + 1) * cos(u),
            y: (u, v) =>  (5 - 2 * cos(u)) * sin(v),
            z: (u, v) => -16 * sin(u)
        }),
        "Mobius strip": new ParametricSurface({
            domain: new Domain([-1, 1], [0, 2 * PI]),
            x: (u, v) => (2 + u * cos(v / 2)) * cos(v),
            y: (u, v) => u * sin(v / 2),
            z: (u, v) => (2 + u * cos(v / 2)) * sin(v)
        }),
        "Torus": new ParametricSurface({
            domain: new Domain([0, 2 * PI], [0, 2 * PI]),
            x: (u, v) => cos(u) * (3 + 1.5 * cos(v)),
            y: (u, v) => sin(u) * (3 + 1.5 * cos(v)),
            z: (u, v) => 2 * sin(v)
        })
    };

    constructor(simulation, surfaceView, options = {
        padding: 0.9,
        translationY: -5
    }) {
        this._simulation = simulation;
        this._surfaceView = surfaceView;    // PlaneSurfaceView
        this._options = options;
        this._currentSurface = null;
    }

    get surface() { return this._currentSurface; }
    set surface(surfaceName) { this.switchTo(surfaceName); }
    set colorMapper(colorMapper) { this._surfaceView.colorMapper = colorMappers[colorMapper]; }
    set scalarField(scalarField) { this._surfaceView.scalarField = scalarFields[scalarField]; }

    switchTo(surfaceName) {
        const newSurface = SurfaceController.surfaces[surfaceName];
        if (!newSurface) throw new Error(`Surface "${surfaceName}" not found`);

        if (this._currentSurface)
            this._surfaceView.dispose();

        this._currentSurface = newSurface;
        this._simulation.synchronize(newSurface.onceWith(this._surfaceView));
        this._simulation.renderer.provideAxesAround(this._surfaceView);
        this._simulation.renderer.frameSceneOn(this._surfaceView, this._options);
    }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("parametricSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("parametricSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(25, 10, 10),
        fieldOfView: 20
    }));


const surfaceView = new StandardSurfaceView({
    scalarField: new GaussianCurvatureField()
});

const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016)
    .onClockTick()
    .start();

const surfaceController = new SurfaceController(simulation, surfaceView);
surfaceController.switchTo("Bow curve"); // Initial surface

const eventController = EventController.for(simulation);
eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(surfaceController)
    .withProperty("colorMapper"));

eventController.attach(HtmlControl
    .withElementId("scalarFieldSelect")
    .forType("change")
    .to(surfaceController)
    .withProperty("scalarField"));

eventController.attach(HtmlControl
    .withElementId("showContours")
    .forType("click")
    .to(surfaceView)
    .withProperty("contoursVisible"));

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

