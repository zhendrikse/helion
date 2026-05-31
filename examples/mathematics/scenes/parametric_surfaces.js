import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    PlaneSurfaceView, EventController, IsoparametricContoursView, Vec3,
    SurfaceColorMapper, ParametricSurface, Interval
} from "helion";

const parametricSurface = new ParametricSurface({
    uRange: new Interval(0, 2 * Math.PI),
    vRange: new Interval(0, 4 * Math.PI),
    width: 4 * Math.PI,
    depth: 4 * Math.PI,
    x: (u, v) => (1 * Math.sin(u) + 2) * Math.sin(v),
    y: (u, v) => (1 * Math.sin(u) + 2) * Math.cos(v),
    z: (u, v) => 1 * Math.cos(u) + 2 * Math.cos(0.5 * v)
});

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("parametricSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("parametricSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(18, 9, 18),
        fieldOfView: 20
    }));

//
// Surface view
//
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.RDYLBU_COLOR_MAP);
const normalizer = (position) => position.y / Math.PI;
const surfaceView = new PlaneSurfaceView({
    uSegments: 100,
    vSegments: 100,
    colorMapper: colorMapper,
    normalizer: normalizer
});
const contoursView = new IsoparametricContoursView({
    uSegments: 20,
    vSegments: 20,
    colorMapper: colorMapper,
    normalizer: normalizer
});

renderer.synchronize(parametricSurface.alwaysWith(surfaceView));
renderer.synchronize(parametricSurface.alwaysWith(contoursView));

renderer.provideAxesFor(surfaceView);

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
    .to(colorMapper)
    .withProperty("mode"));

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