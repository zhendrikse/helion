import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    Surface, EventController, IsoparametricContoursView, PlaneSurfaceView, Vec3, SurfaceColorMapper
} from "helion";


class ParametricSurface extends Surface {
    constructor({
        width = 10,
        depth = 10,
        amplitude = 2
    } = {}) {
        super();
        this._width = width;
        this._depth = depth;
        this._amplitude = amplitude;
        this._time = 0;
        this._animate = false;
    }

    update(dt) {
        if (this._animate)
            this._time += dt;
    }

    set animate(value) { this._animate = value; }

    f_x_y_t_1(x, y, t) {
        const r2 = -x * x - y * y;
        return this._amplitude * Math.exp(.25 * r2) * (1 - Math.sin(Math.PI * this._time));
    }

    f_x_y_t(x, y, t) {
        const r = Math.sqrt(x * x + y * y);
        return this._amplitude * Math.sin(Math.PI * r - Math.PI * this._time);
    }

    sample(u, v, target) {
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;
        target.set(x, this.f_x_y_t(x, z), z);
    }

    get amplitude() { return this._amplitude; }
}

//
// Math objects
//
const surface = new ParametricSurface();

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("parametricSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("parametricSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(20, 10, 20),
        fieldOfView: 20
    }));

//
// Surface view
//
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.RDYLBU_COLOR_MAP);
const normalizer = (position) => (position.y + surface.amplitude) / (2 * surface.amplitude);
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

renderer.synchronize(surface.alwaysWith(surfaceView));
renderer.synchronize(surface.alwaysWith(contoursView));

renderer.provideAxesFor(surfaceView);

//
// Simulation
//
const simulation = Simulation
    .with(renderer)
    .onClockTick((clockTime, simulatedTime) => surface.update(0.016), 1)
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
    .withElementId("animate")
    .forType("click")
    .to(surface)
    .withProperty("animate"));

eventController.attach(HtmlControl
    .withElementId("showWireframe")
    .forType("click")
    .to(surfaceView)
    .withProperty("wireframe"));