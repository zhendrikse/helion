import {
    ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation, HtmlControl, HeightFieldSurface,
    ScalarField, EventController, IsoparametricContoursView, PlaneSurfaceView, Vec3, SurfaceColorMapper
} from "helion";


class SurfaceScalarField extends ScalarField {
    constructor({
        amplitude = 2
    } = {}) {
        super();
        this._amplitude = amplitude;
        this._time = 0;
        this._animate = false;
    }

    updateWith(newTime) {
        if (this._animate)
            this._time = newTime;
    }

    set animate(value) { this._animate = value; }

    f_x_y_t_1(x, y, t) {
        const r2 = -x * x - y * y;
        return this._amplitude * Math.exp(.25 * r2) * (1 - Math.sin(Math.PI * t));
    }

    f_x_y_t(x, y, t) {
        const r = Math.sqrt(x * x + y * y);
        return this._amplitude * Math.sin(Math.PI * r - Math.PI * t);
    }

    scalarValueAt(x, y) {
        return this.f_x_y_t(x, y, this._time);
    }

    get amplitude() { return this._amplitude; }
}

//
// Math objects
//
const scalarField = new SurfaceScalarField();
const heightFieldSurface = new HeightFieldSurface({
    field: scalarField
});

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("realSurfacesCanvasWrapper")
        .contains(Canvas.withElementId("realSurfacesCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(30, 15, 30),
        fieldOfView: 20
    }));

//
// Surface view
//
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.RDYLBU_COLOR_MAP);
const normalizer = (position) => (position.y + scalarField.amplitude) / (2 * scalarField.amplitude);
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

renderer.synchronize(heightFieldSurface.alwaysWith(surfaceView));
renderer.synchronize(heightFieldSurface.alwaysWith(contoursView));

renderer.provideAxesFor(surfaceView);

//
// Simulation
//
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(0.016)
    .onClockTick((clockTime, simulatedTime) => scalarField.updateWith(simulatedTime), 1)
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
    .to(scalarField)
    .withProperty("animate"));

eventController.attach(HtmlControl
    .withElementId("showWireframe")
    .forType("click")
    .to(surfaceView)
    .withProperty("wireframe"));