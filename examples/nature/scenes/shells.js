import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    EventController, Vec3, ParametricSurface,
    Domain, StandardSurfaceView, SurfaceResolution, ColorMappers
} from "../../../src/index.js";

const sin = Math.sin;
const cos = Math.cos;
const exp = Math.exp;
const PI = Math.PI;

const surfaces = {
    "Astroceras": new ParametricSurface({
        domain: new Domain([-40, -1], [0, 2 * PI]),
        x: (u, v) => (3.5 + 1.25 * cos(v)) * exp(0.12 * u) * cos(1 * u),
        y: (u, v) => (3.5 + 1.25 * cos(v)) * exp(0.12 * u) * sin(1 * u),
        z: (u, v) => (0 + 1.25 * sin(v)) * exp(0.12 * u)
    }),
    "Bellerophina": new ParametricSurface({
        domain: new Domain([-10, 1], [0, 2 * PI]),
        x: (u, v) => (0.75 + 0.85 * cos(v)) * exp(0.06 * u) * cos(1 * u),
        y: (u, v) => (0.75 + 0.85 * cos(v)) * exp(0.06 * u) * sin(1 * u),
        z: (u, v) => (0  +  1.2  * sin(v)) * exp(0.06 * u)
    }),
    "Conchoidal": new ParametricSurface({
        domain: new Domain([0, 6 * PI], [0, 2 * PI]),
        x: (u, v) => 1.2 **u * (1 + cos(v)) * cos(u),
        y: (u, v) => 1.2 **u * (1 + cos(v)) * sin(u),
        z: (u, v) => 1.2 **u * sin(v) - 1.5 * 1.2 **u
    }),
    "Euhoplites": new ParametricSurface({
        domain: new Domain([-40, -1], [0, 2 * PI]),
        x: (u, v) => (0.9 + 0.6 * cos(v)) * exp(0.1626 * u) * cos(1 * u),
        y: (u, v) => (0.9 + 0.6 * cos(v)) * exp(0.1626 * u) * sin(1 * u),
        z: (u, v) => (0  +  0.4 * sin(v)) * exp(0.1626 * u)
    }),
    "Mya arenaria": new ParametricSurface({
        domain: new Domain([-1, 0.52], [0, 2 * PI]),
        x: (u, v) => (0.9 + 0.85 * cos(v)) * exp(2.5 * u) * cos(3 * u),
        y: (u, v) => (0.9 + 0.85 * cos(v)) * exp(2.5 * u) * sin(3 * u),
        z: (u, v) => (0  + 1.6 * sin(v)) * exp(2.5 * u)
    }),
    "Nautilus": new ParametricSurface({
        domain: new Domain([-20, 1], [0, 2 * PI]),
        x: (u, v) => (1 + 1 * cos(v)) * exp(0.18 * u) * cos(1 * u),
        y: (u, v) => (1 + 1 * cos(v)) * exp(0.18 * u) * sin(1 * u),
        z: (u, v) => (0 + 0.6 * sin(v)) * exp(0.12 * u)
    }),
    "Pseudoheliceras subcatenatum": new ParametricSurface({
        domain: new Domain([-45, -1], [0, 2 * PI]),
        x: (u, v) => (1.5 + 1.6 * cos(v)) * exp(0.075 * u) * cos(1 * u),
        y: (u, v) => (1.5 + 1.6 * cos(v)) * exp(0.075 * u) * sin(1 * u),
        z: (u, v) => (-7  + 1.6 * sin(v)) * exp(0.075 * u)
    }),
    "Sea shell": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 2 * PI]),
        x: (u, v) => 2 * (1 - v / (2 * PI)) * cos(3 * v) * (1 + cos(u)) + 0.25 * cos(3 * v),
        y: (u, v) => 2 * (1 - v / (2 * PI)) * sin(3 * v) * (1 + cos(u)) + 0.25 * sin(3 * v),
        z: (u, v) => (7 * v / (2 * PI)) + 2 * (1 - v / (2 * PI)) * sin(u)
    })
};

class SurfaceController {
    constructor(simulation, surfaceView, options = {
        padding: 0.65,
        translationY: -1
    }) {
        this._simulation = simulation;
        this._surfaceView = surfaceView;
        this._options = options;
        this._currentSurface = null;
    }

    get surface() { return this._currentSurface; }
    set surface(surfaceName) { this.switchTo(surfaceName); }

    switchTo(surfaceName) {
        const newSurface = surfaces[surfaceName];
        if (!newSurface) throw new Error(`Surface "${surfaceName}" not found`);

        if (this._currentSurface)
            this._surfaceView.dispose();

        this._currentSurface = newSurface;
        this._simulation.synchronize(newSurface.onceWith(this._surfaceView));
        this._simulation.renderer.frameSceneOn(this._surfaceView, this._options);
    }
}

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("shellsCanvasWrapper")
        .contains(Canvas.withElementId("shellsCanvas")))
    .with(new ThreeJsRenderOptions({
        fieldOfView: 20
    }));


const surfaceView = new StandardSurfaceView({
    opacity: 0.95,
    surfaceResolution: new SurfaceResolution(200, 200),
    contourResolution: new SurfaceResolution(100, 50),
    colorMapper: ColorMappers.RdYlBu
});

const simulation = Simulation
    .with(renderer)
    .onClockTick(() => surfaceView.rotation.y += 0.0167)
    .start();

const surfaceController = new SurfaceController(simulation, surfaceView);
surfaceController.switchTo("Sea shell"); // Initial surface

const eventController = EventController.for(simulation);
surfaceView.contoursVisible = false;

eventController.attach(HtmlControl
    .withElementId("surfaceSelect")
    .forType("change")
    .to(surfaceController)
    .withProperty("surface"));

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

