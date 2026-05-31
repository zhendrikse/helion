import {ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation,
    Surface, ScalarField, PlaneSurfaceView, IsoparametricContoursView,
    HtmlControl, EventController, SurfaceColorMapper, Vec3 } from "helion";

class MembraneScalarField extends ScalarField {
    constructor({
        width = 15,
        depth = 15,
        omega = Math.PI / 2,
        amplitude = 2
    } = {}) {
        super();
        this._omega = omega;
        this._width = width;
        this._depth = depth;
        this._amplitude = amplitude;
        this._waveCountX = 1;
        this._waveCountY = 1;
        this._time = 0;
    }

    get amplitude() { return this._amplitude; }
    get depth() { return this._depth; }
    get width() { return this._width; }
    set waveCountX(waveCountX) { this._waveCountX = waveCountX; }
    set waveCountY(waveCountY) { this._waveCountY = waveCountY; }

    updateWith(time) { this._time = time; }

    scalarValueAt(x, y) {
        return this._amplitude *  Math.cos(this._omega * this._time) *
            Math.cos(Math.PI * x * this._waveCountX / this._width) *
            Math.cos(Math.PI * y * this._waveCountY / this._depth);
    }
}

class WaveSurface extends Surface {
    constructor({
        scalarField,
        width = 15,
        depth = 15
    } = {}) {
        super();
        this._scalarField = scalarField;
        this._width = width;
        this._depth = depth;
    }

    sample(u, v, target) {
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;
        target.set(x, this._scalarField.scalarValueAt(x, z), z);
    }
}

//
// Math objects
//
const scalarField = new MembraneScalarField();
const waveSurface = new WaveSurface({
    scalarField,
    width: scalarField.width,
    depth: scalarField.depth
});

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("membraneCanvasWrapper").contains(Canvas.withElementId("membraneCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(0, 10, 17),
        fieldOfView: 45,
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
renderer.synchronize(waveSurface.alwaysWith(surfaceView));
renderer.synchronize(waveSurface.alwaysWith(contoursView));

//
// Simulation
//
const dt = 0.016;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => scalarField.updateWith(simulatedTime), 3)
    .start();

// document.getElementById("colorMapSelect").addEventListener("change", (event) => {
//     colorMapper.mode = event.target.value;
// })

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

for (let i = 1; i < 6; i++) {
    eventController.attach(HtmlControl
        .withElementId("x" + i)
        .forType("click")
        .to(scalarField)
        .withProperty("waveCountX"));

    eventController.attach(HtmlControl
        .withElementId("y" + i)
        .forType("click")
        .to(scalarField)
        .withProperty("waveCountY"));
}
