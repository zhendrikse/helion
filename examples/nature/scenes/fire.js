import { Color} from "three";
import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, ColorMapper, Interval, FixedIntervalNormalizer
} from "../../../src/index.js";

export class FireColorMapper extends ColorMapper {
    constructor() {
        super();
        this._p1 = new Color(0x000000);
        this._p2 = new Color(0x500000); // dark red
        this._p3 = new Color(0xffff80); // yellowish
    }

    // intensity from DiscreteScalarField (0..1, clamped), as in VPython fire.py
    // VPython palette: p1(0,0,0) -> p2(80,0,0) -> p3(255,255,128) over 256 steps
    // Here we map intensity 0..1 directly via lerp
    map(intensity, targetColor) {
        const t = Math.max(0, Math.min(1, intensity));
        // Use same piecewise as palette: 0..0.5 -> p1->p2, 0.5..1 -> p2->p3
        if (t < 0.5) 
            targetColor.copy(this._p1).lerp(this._p2, t * 2);
        else
            targetColor.copy(this._p2).lerp(this._p3, (t - 0.5) * 2);
    }
}

export class FireSolver {
    // Fire diffusion as in VPython fire.py / Beltoforion
    // Works on DiscreteScalarField Float32Array (intensity 0..1)
    step(field) {
        // double buffer like VPython old[][] copy
        const old = new Float32Array(field.data);

        for (let row = 0; row < field.ny; row++)
            for (let col = 0; col < field.nx; col++) 
                this._doStep(field, row, col, old);
    }

    _doStep(field, row, col, old) {
        const idx = col + row * field.nx;
        if (row === 0 && col > 5 && col < field.nx - 5) {
            const below = old[col + 1 * field.nx] ?? 0;
            field.setValueAt(col, row, below + Math.random() * 0.9);
            return;
        } 

        const intensity = 4.1 + 0.3 * (Math.abs(col - field.nx / 2) / (field.nx / 2));
        const a = (col > 0 && row > 0) ? old[(col - 1) + (row - 1) * field.nx] : 0;
        const b = (row > 0) ? old[col + (row - 1) * field.nx] : 0;
        const c = (col + 1 < field.nx && row > 0) ? old[(col + 1) + (row - 1) * field.nx] : 0;
        const d = (row > 1) ? old[col + (row - 2) * field.nx] : 0;
        field.setValueAt(col, row, (a + b + c + d) / intensity);
    }

    reset() {}
}

class Fire extends DiscreteScalarField {
    constructor({ nx = 200, ny = 140 } = {}) {
        super({ nx, ny });
    }

    valueAt(x, y) {
        if (x < 0 || x >= this.nx || y < 0 || y >= this.ny) 
            return 0;
        
        if (y <= 2) // Bottom 3 rows are fuel, not flame — keep black like VPython `*(r>2)`
            return 0;
            
        return super.valueAt(x, y);
    }
}

const NX = 200;
const NY = 140;
const cellSize = 2;

const field = new Fire({ nx: NX, ny: NY });
const solver = new FireSolver();
const view = new TiledPlane({
    cellSize: cellSize,
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    colorMapper: new FireColorMapper(),
    opacity: 1
});

// Seed bottom row like VPython init()
for (let c = 0; c < NX; c++) field.setValueAt(c, 0, Math.random());

Simulation
    .with({
        htmlDivId: "fireContainer",
        viewport: {
            aspectRatio: NX / NY
        },
        camera: {
            position: new Vec3(0, 0, NX * cellSize * .7),
            orthographic: true
        },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: "<strong>🔥 Fire</strong><br/> Helion port of VPython " + 
            "<a href=\"https://github.com/beltoforion/recreational_mathematics_with_python/blob/master/Fire/fire.py\">fire.py</a> " + 
            "<a href=\"https://beltoforion.de/en/\">(Beltoforion</a> $\\rightarrow$ <a href=\"https://www.hendrikse.name\">Zeger</a>).<br/> " + 
            "Bottom row random fuel, then diffusion with intensity<br/><br/>\n" + 
            "$$\n4.1+\\dfrac{0.3*\\|x-center\\|}{center}.\n$$"
        }
    })
    .bind(field.alwaysWith(view))
    .runsEvery(1 / 60)
    .onStep( () => field.evolve(solver))
    .onReset(() => {
        field.data.fill(0);
        for (let c = 0; c < NX; c++) 
            field.setValueAt(c, 0, Math.random());
    })
    .start();
