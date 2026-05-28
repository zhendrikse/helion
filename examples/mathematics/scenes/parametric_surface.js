import {ThreeJsRenderer, ThreeJsRenderOptions, Canvas, HtmlDiv, Simulation,
    Surface, FiniteDifferenceMethodField, PDESurface, IsoparametricContoursView,
    SphereSurfaceView, PlaneSurfaceView, Vec3 } from "helion";


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
}

//
// Math objects
//
// Example dynamic surface
// const waveSurface = new WaveSurface();

// Example PDE surface
const waveField = new FiniteDifferenceMethodField({ resolution: 100 });
const waveSurface = new PDESurface({
    field: waveField,
    width: 12,
    depth: 12
});

//
// Renderer
//
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("waveCanvasWrapper").contains(Canvas.withElementId("waveCanvas")))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(0, 8, 14),
        fieldOfView: 45
    }));

//
// Surface view
//
const sphereSurface = new PlaneSurfaceView({ uSegments: 50, vSegments: 50 });
renderer.synchronize(waveSurface.alwaysWith(sphereSurface));

renderer.provideAxesFor(sphereSurface);

//
// Simulation
//
Simulation
    .with(renderer)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => {
        waveSurface.update(0.016);
    }, 3)
    .start();