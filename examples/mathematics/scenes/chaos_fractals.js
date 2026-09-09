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
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            const currentCount = field.valueAt(px, py);
            field.setValueAt(px, py, currentCount + 1);
        }
    }
}

class CantorDust extends Transformation {
    applyTo(field) {
        const scale = field.nx / 2;
        const jumps = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
        let x = 0, y = 0.3;
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            const idx = Math.trunc(Math.random() * 4);
            x = 0.45 * (x + jumps[idx][0] * scale);
            y = 0.45 * (y + jumps[idx][1] * scale);
            const px = Math.trunc(x + scale);
            const py = Math.trunc(y + scale);
            if (px < 0 || px >= field.nx || py < 0 || py >= field.ny) continue;
            field.setValueAt(px, py, field.valueAt(px, py) + 1);
        }
    }
}

class Fractal1 extends Transformation {
    // chaos game on square, never pick same vertex twice consecutively
    applyTo(field) {
        const scale = field.nx / 2;
        const jumps = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
        let x = 0, y = 0.3;
        let cur = Math.trunc(Math.random() * 4);
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            x = 0.5 * (x + jumps[cur][0] * scale);
            y = 0.5 * (y + jumps[cur][1] * scale);
            const px = Math.trunc(x + scale);
            const py = Math.trunc(y + scale);
            if (px >= 0 && px < field.nx && py >= 0 && py < field.ny)
                field.setValueAt(px, py, field.valueAt(px, py) + 1);
            const sample = [0, 1, 2, 3];
            sample.splice(cur, 1);
            cur = sample[Math.trunc(Math.random() * 3)];
        }
    }
}

class Fractal2 extends Transformation {
    // pentagon chaos game, 5 vertices on unit pentagon
    applyTo(field) {
        const w = 1;
        const theta = 2 * Math.PI / 5;
        const p1 = [w / 2, 0];
        const p2 = [w * 0.5 * (1 + Math.sin(theta)), w * 0.5 * (1 - Math.cos(theta))];
        const p3 = [w * 0.5 * (1 + Math.sin(theta / 2)), w * 0.5 * (1 + Math.cos(theta / 2))];
        const p4 = [w * 0.5 * (1 - Math.sin(theta / 2)), w * 0.5 * (1 + Math.cos(theta / 2))];
        const p5 = [w * 0.5 * (1 - Math.sin(theta)), w * 0.5 * (1 - Math.cos(theta))];
        const jumps = [p1, p2, p3, p4, p5];
        const scale = field.nx;
        let x = 0, y = 0.3;
        let cur = Math.trunc(Math.random() * 5);
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            x = 0.5 * (x + jumps[cur][0] * scale);
            y = 0.5 * (y + jumps[cur][1] * scale);
            const px = Math.trunc(x + scale * 0.01);
            const py = Math.trunc(y + scale * 0.01);
            if (px >= 0 && px < field.nx && py >= 0 && py < field.ny)
                field.setValueAt(px, py, field.valueAt(px, py) + 1);
            const sample = [0, 1, 2, 3, 4];
            sample.splice(cur, 1);
            cur = sample[Math.trunc(Math.random() * 4)];
        }
    }
}

class SierpinskiCarpet extends Transformation {
    applyTo(field) {
        const scale = field.nx / 2;
        const jumps = [[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, 0], [1, 0], [0, -1], [0, 1]];
        // last 4 are edge centers: [-1,0] etc. from original [[a1,b1+b2]...]
        let x = 0, y = 0.3;
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            const idx = Math.trunc(Math.random() * 8);
            x = (x + 2 * jumps[idx][0] * scale) / 3;
            y = (y + 2 * jumps[idx][1] * scale) / 3;
            const px = Math.trunc(x + scale);
            const py = Math.trunc(y + scale);
            if (px < 0 || px >= field.nx || py < 0 || py >= field.ny) continue;
            field.setValueAt(px, py, field.valueAt(px, py) + 1);
        }
    }
}

class TSquare extends Transformation {
    // T-square: square, no opposite vertex twice
    applyTo(field) {
        const scale = field.nx / 2;
        const jumps = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
        let x = 0, y = 0.3;
        let cur = Math.trunc(Math.random() * 4);
        for (let i = 0; i < ITERATIONS_PER_FRAME; i++) {
            x = 0.5 * (x + jumps[cur][0] * scale);
            y = 0.5 * (y + jumps[cur][1] * scale);
            const px = Math.trunc(x + scale);
            const py = Math.trunc(y + scale);
            if (px >= 0 && px < field.nx && py >= 0 && py < field.ny)
                field.setValueAt(px, py, field.valueAt(px, py) + 1);
            const sample = [0, 1, 2, 3];
            if (cur === 0) sample.splice(2, 1);
            else if (cur === 1) sample.splice(3, 1);
            else if (cur === 2) sample.splice(0, 1);
            else if (cur === 3) sample.splice(1, 1);
            cur = sample[Math.trunc(Math.random() * 3)];
        }
    }
}

const fractals = {
    Sierpinski: new SierpinskiTriangle(),
    Vicsek: new VicsekFractal(),
    Barnsley: new BarnsleyFern(),
    Cantor: new CantorDust(),
    Fractal1: new Fractal1(),
    Fractal2: new Fractal2(),
    Carpet: new SierpinskiCarpet(),
    TSquare: new TSquare()
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
    .append(new Button()
        .withText("⚠️ Sierpinski triangle")
        .onClick(event => { 
            field.data.fill(0); 
            currentFractal = fractals.Sierpinski; 
        }).togetherWith(new Button()
            .withText("🌿 Barnsley fern")
            .onClick(event => {
                field.data.fill(0); 
                currentFractal = fractals.Barnsley; 
            })))
    .append(new Button()
        .withText("🧹 Cantor dust")
        .onClick(event => { 
            field.data.fill(0); 
            currentFractal = fractals.Cantor; 
        }).togetherWith(new Button()
            .withText("🧶 Sierpinski carpet")
            .onClick(event => {
                field.data.fill(0); 
                currentFractal = fractals.Carpet; 
            })))
    .append(new Button()
        .withText("⭐ Fractal star")
        .onClick(event => { 
            field.data.fill(0); 
            currentFractal = fractals.Fractal1; 
        }).togetherWith(new Button()
            .withText("🌻 Fractal flower")
            .onClick(event => {
                field.data.fill(0); 
                currentFractal = fractals.Fractal2; 
            })))
    .append(new Button()
        .withText("🟨 T-square fractal")
        .onClick(event => { 
            field.data.fill(0); 
            currentFractal = fractals.TSquare; 
        }))
    .append(new Slider("Contrast")
        .withRange(new Range(0, 20, .1))
        .withValue(5)
        // @ts-ignore
        .onInput(event => colorMapper.scale = Number(event.target.value)))
    .append(new Button("Clear")
        .withText("Clear")
        .addEventListener("click", () => field.data.fill(0)))
    .start();


