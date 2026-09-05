import {
    Simulation, Vec3, Slider, Range, RadioGroup, Button, ColorMappers, DiscreteFieldSurfaceView,
    SurfaceResolution, DiscreteScalarField, ColorMapper, Transformation
} from "../../../src/index.js";

const NX = 1000;
const NY = 1000;
const ITERATIONS_PER_FRAME = 5000;

class HitCountColorMapper extends ColorMapper {
    constructor({
        palette = ColorMappers.get(ColorMappers.Viridis),
        scale = 5,
        log = true
    } = {}) {
        super();
        this._palette = palette;
        this._scale = scale;
        this._log = log;
    }

    set scale(v) { this._scale = v; }

    map(normalized, targetColor) {
        // Gamma correction for low hit-count visibility: scale controls gamma
        // scale=1 → linear, scale=5 → pow(0.2) makes 1% hits → 40% brightness
        const t = this._log
            ? Math.pow(Math.max(0, normalized), 1 / Math.max(1, this._scale))
            : normalized;
        this._palette.map(Math.max(0, Math.min(1, t)), targetColor);
    }
}

const colorMapper = new HitCountColorMapper({
    palette: ColorMappers.get(ColorMappers.Viridis),
    scale: 5,
    log: true
});

// Generic hit-count field + view (resolution simple, only fractalFn changes)
const field = new DiscreteScalarField({ nx: NX, ny: NY });
const view = new DiscreteFieldSurfaceView({
    colorMapper,
    opacityFunction: intensity => intensity === 0 ? 0 : .8
});

class SierpinskiTriangle extends Transformation {
    applyTo(field) {
        const scale = field.nx;
        const jump = [[-0.5, -0.433], [0.5, -0.433], [0, 0.3]];
        let x = 0, y = 0.3;
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            const idx = Math.trunc(Math.random() * 3);
            x = 0.5 * (x + jump[idx][0] * scale);
            y = 0.5 * (y + jump[idx][1] * scale);

            const i = Math.trunc(x + scale * 0.5);
            const j = Math.trunc(y + scale * 0.5);
            const currentCount = field.valueAt(i, j);
            field.setValueAt(i, j, currentCount + 1);
        }
    }
}

class VicsekFractal extends Transformation {
    applyTo(field) {
        const scale = field.nx / 2;
        const jump = [[-1, -1], [-1, 1], [1, 1], [1, -1], [0, 0]];
        let x = 0, y = 0.3;
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            const idx = Math.trunc(Math.random() * 5);
            x = (x + 2 * jump[idx][0] * scale) / 3;
            y = (y + 2 * jump[idx][1] * scale) / 3;
            // keep y up → py up
            const i = Math.trunc(x + scale);
            const j = Math.trunc(y + scale);
            const currentCount = field.valueAt(i, j);
            field.setValueAt(i, j, currentCount + 1);
        }
    }
}

class BarnsleyFern extends Transformation {
    applyTo(field) {
        let x = 0, y = 0;
        const w = field.nx, h = field.ny;
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            const r = Math.random();
            let nx = 0, ny = 0;
            if (r < 0.01) { nx = 0; ny = 0.16 * y; }
            else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
            else if (r < 0.93) { nx = 0.20 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
            else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
            x = nx; y = ny;
            const px = Math.trunc(w * (x + 3) / 6);
            const py = Math.trunc(h * y / 10);
            const currentCount = field.valueAt(px, py);
            field.setValueAt(px, py, currentCount + 1);
        }
    }
}

const fractals = {
    Sierpinski: new SierpinskiTriangle(),
    Vicsek: new VicsekFractal(),
    Barnsley: new BarnsleyFern()
};

let currentFractal = fractals.Sierpinski;

Simulation
    .with({
        htmlDivId: "chaosFractalsContainer",
        camera: { orthographic: true },
        headUpDisplay: { enabled: false },
        parameterMenuCollapsed: false
    })
    .bind(field.alwaysWith(view))
    .runsEvery(0.1)
    .onStep(() => field.apply(currentFractal))
    .frameSceneOn(view, { padding: 1.1, viewDirection: new Vec3(0, 0, 1) })
    .append(new RadioGroup()
        .add("Sierpinski", () => { field.data.fill(0); currentFractal = fractals.Sierpinski; })
        .add("Vicsek", () =>     { field.data.fill(0); currentFractal = fractals.Vicsek; })
        .add("Barnsley", () =>   { field.data.fill(0); currentFractal = fractals.Barnsley; })
        .checked(0))
    .append(new Slider("Contrast")
        .withRange(new Range(0, 20, .1))
        .withValue(5)
        .onInput(event => colorMapper.scale = Number(event.target.value)))
    .append(new Button("Clear")
        .withText("Clear")
        .addEventListener("click", () => field.data.fill(0)))
    .start();


