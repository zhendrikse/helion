import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl,
    Surface, EventController, IsoparametricContoursView, PlaneSurfaceView, Vec3, SurfaceColorMapper
} from "helion";


class WaveSurface extends Surface {
    constructor({
        width = 10,
        depth = 10,
        amplitude = 1
    } = {}) {
        super();
        this._width = width;
        this._depth = depth;
        this._amplitude = amplitude;
        this._time = 0;
    }

    update(dt) { this._time += dt; }

    sample(u, v, target) {
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;
        const r = Math.sqrt(x*x + z*z);
        const y = this._amplitude * Math.sin(4 * r - 3 * this._time);

        target.set(x, y, z);
    }

    get amplitude() { return this._amplitude; }
}

//
// Math objects
//
const waveSurface = new WaveSurface();

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("parametricSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("parametricSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(10, 5, 10),
        fieldOfView: 45
    }));

//
// Surface view
//
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.RDYLBU_COLOR_MAP);
const normalizer = (position) => (position.y + waveSurface.amplitude) / (2 * waveSurface.amplitude);
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

renderer.synchronize(waveSurface.alwaysWith(surfaceView));
renderer.synchronize(waveSurface.alwaysWith(contoursView));

renderer.provideAxesFor(surfaceView);

//
// Simulation
//
const simulation = Simulation
    .with(renderer)
    .onClockTick((clockTime, simulatedTime) => waveSurface.update(0.016), 1)
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