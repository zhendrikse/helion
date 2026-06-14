import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    EventController, Vec3, ParametricSurface, GaussianCurvatureField,
    Domain, StandardSurfaceView, ColorMappers
} from "../../../src/index.js";

const sin = Math.sin;
const cos = Math.cos;
const PI = Math.PI;

//
// https://paulbourke.net/geometry/sphericalh/
//
const params = {
    a: 1, b: 18, c: 1, d: 18, e: 1, f: 4, g: 1, h: 4
}
const r = (u, v) =>
    sin(params.a * u) ** params.b +
    cos(params.c * u) ** params.d +
    sin(params.e * v) ** params.f +
    cos(params.g * v) ** params.h;

const surface = new ParametricSurface({
    domain: new Domain([-PI, PI], [0, PI]),
    x: (u, v) => sin(u) * cos(v) * r(u, v),
    y: (u, v) => sin(u) * sin(v) * r(u, v),
    z: (u, v) => cos(u) * r(u, v),
})

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("sphericalHarmonicsCanvasWrapper")
        .contains(Canvas.withElementId("sphericalHarmonicsCanvas")))
    .with({ fieldOfView: 20 });

const surfaceView = new StandardSurfaceView({
    colorMapperType: ColorMappers.get("RdYlBu"),
    opacity: 0.9
});

const simulation = Simulation
    .with(renderer)
    .synchronize(surface.onceWith(surfaceView))
    .onClockTick()
    .start();

renderer.provideAxesAround(surfaceView);
renderer.frameSceneOn(surfaceView, { translationY: -10 });

const eventController = EventController.for(simulation);
eventController.attach(HtmlControl
    .withElementId("colorMapSelect")
    .forType("change")
    .to(surfaceView)
    .withProperty("colorMapper"));

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

