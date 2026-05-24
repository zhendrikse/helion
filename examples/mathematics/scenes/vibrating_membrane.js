import {ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation,
    Surface, ScalarField, PlaneSurfaceView, IsoparametricContoursView,
    SphereSurfaceView, SurfaceColorMapper, Vec3 } from "helion";

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
        this._waveCountX = 2;
        this._waveCountY = 1;
        this._time = 0;
    }

    get amplitude() { return this._amplitude; }
    get depth() { return this._depth; }
    get width() { return this._width; }

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
        cameraPosition: new Vec3(0, 8, 14),
        fieldOfView: 45,
    }));

//
// Surface view
//
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.JET_COLOR_MAP);
// renderer.synchronize(waveSurface.alwaysWith(new PlaneSurfaceView({
//     uSegments: 100,
//     vSegments: 100,
//     colorMapper: colorMapper,
//     normalizer: (position) =>
//         (position.y + scalarField.amplitude) /
//         (2 * scalarField.amplitude)
// })));
renderer.synchronize(waveSurface.alwaysWith(new IsoparametricContoursView({
    uSegments: 20,
    vSegments: 20}
)));

//
// Simulation
//
const dt = 0.016;
Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => scalarField.updateWith(simulatedTime), 3)
    .start();