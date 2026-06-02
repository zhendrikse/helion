import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    PlaneSurfaceView, EventController, IsoparametricContoursView, Vec3,
    ParametricSurface, Interval, GaussianCurvatureField, scalarFields, colorMappers
} from "../../../src/index.js";

const surfaces = {
    "Bow curve": new ParametricSurface({
        uRange: new Interval(0, 2 * Math.PI),
        vRange: new Interval(0, 4 * Math.PI),
        x: (u, v) => (1 * Math.sin(u) + 2) * Math.sin(v),
        y: (u, v) => (1 * Math.sin(u) + 2) * Math.cos(v),
        z: (u, v) => 1 * Math.cos(u) + 2 * Math.cos(0.5 * v)
    }),
    "Klein bottle": new ParametricSurface({
        uRange: new Interval(0, 2 * Math.PI),
        vRange: new Interval(0, 2 * Math.PI),
        x: (u, v) => -(5 - 2 * Math.cos(u)) * Math.cos(v) + 6 * (Math.sin(u) + 1) * Math.cos(u),
        y: (u, v) =>  (5 - 2 * Math.cos(u)) * Math.sin(v),
        z: (u, v) => -16 * Math.sin(u)
    }),
    "Mobius strip": new ParametricSurface({
        uRange: new Interval(-1, 1),
        vRange: new Interval(0, 2 * Math.PI),
        x: (u, v) => (2 + u * Math.cos(v / 2)) * Math.cos(v),
        y: (u, v) => u * Math.sin(v / 2),
        z: (u, v) => (2 + u * Math.cos(v / 2)) * Math.sin(v)
    }),
    "Torus": new ParametricSurface({
        uRange: new Interval(0, 2 * Math.PI),
        vRange: new Interval(0, 2 * Math.PI),
        x: (u, v) => Math.cos(u) * (3 + 1.5 * Math.cos(v)),
        y: (u, v) => Math.sin(u) * (3 + 1.5 * Math.cos(v)),
        z: (u, v) => 2 * Math.sin(v)
    })
};

class SurfaceController {
    constructor(renderer, surfaces, surfaceView, contoursView, options = {}) {
        this._renderer = renderer;
        this._surfaces = surfaces;          // object: { name: ParametricSurface, ... }
        this._surfaceView = surfaceView;    // PlaneSurfaceView
        this._contoursView = contoursView;  // IsoparametricContoursView
        this._options = options;
        this._currentSurface = null;
    }

    get surface() { return this._currentSurface; }
    set surface(surfaceName) { this.switchTo(surfaceName); }
    set colorMapper(colorMapper) {
        this._surfaceView.colorMapper = colorMappers[colorMapper];
        this._contoursView.colorMapper = colorMappers[colorMapper];
    }
    set scalarField(scalarField) {
        this._surfaceView.scalarField = scalarFields[scalarField];
        this._contoursView.scalarField = scalarFields[scalarField];
    }

    switchTo(surfaceName) {
        const newSurface = this._surfaces[surfaceName];
        if (!newSurface) throw new Error(`Surface "${surfaceName}" not found`);

        if (this._currentSurface) {
            this._surfaceView.dispose();
            this._contoursView.dispose();
        }

        this._currentSurface = newSurface;
        this._renderer.synchronize(newSurface.alwaysWith(this._surfaceView));
        this._renderer.synchronize(newSurface.alwaysWith(this._contoursView));

        this._renderer.provideAxesAround(this._surfaceView);
        this._renderer.frameSceneOn(this._surfaceView, this._options);
    }
}

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("parametricSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("parametricSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(25, 10, 10),
        fieldOfView: 20
    }));

//
// Surface view
//
const surfaceView = new PlaneSurfaceView({
    uSegments: 100,
    vSegments: 100,
    scalarField: new GaussianCurvatureField(),
});
const contoursView = new IsoparametricContoursView({
    uSegments: 20,
    vSegments: 40,
    scalarField: new GaussianCurvatureField()
});

// surfaces: object met ParametricSurface instances
const surfaceController = new SurfaceController(
    renderer,
    surfaces,
    surfaceView,
    contoursView,
    { padding: 0.9, translationY: -5 }
);

// Initial surface
surfaceController.switchTo("Bow curve");

//
// Simulation
//
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016)
    .onClockTick()
    .start();

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
    .to(contoursView)
    .withProperty("visible"));

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

