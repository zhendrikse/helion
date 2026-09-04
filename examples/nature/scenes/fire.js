import {
    Simulation, Vec3, MathPhysicsModelBehavior, TiledPlane, HexValueColorMapper
} from "../../../src/index.js";
import { Color } from "three";

class Fire extends MathPhysicsModelBehavior {
    constructor(nx = 200, ny = 140) {
        super();
        this.nx = nx;
        this.ny = ny;
        this._cells = Array.from({ length: nx }, () => Array(ny).fill(0));
        this._palette = this._createPalette();
        this.reset();
    }

    _createPalette() {
        // p1 black -> p2 dark red -> p3 yellowish, as in VPython fire.py
        const p1 = new Vec3(0, 0, 0);
        const p2 = new Vec3(80, 0, 0);
        const p3 = new Vec3(255, 255, 128);
        const palette = [];
        for (let i = 0; i < 256; i++) {
            const t = i < 128 ? i / 128 : (i - 128) / 128;
            const from = i < 128 ? p1 : p2;
            const to = i < 128 ? p2 : p3;
            const col = from.clone().lerp(to, t).divideScalar(255);
            palette.push(new Color(col.x, col.y, col.z).getHex());
        }
        return palette;
    }

    reset() {
        for (let c = 0; c < this.nx; c++)
            for (let r = 0; r < this.ny; r++)
                this._cells[c][r] = 0;

        for (let c = 0; c < this.nx; c++)
            this._cells[c][0] = Math.random();
    }

    valueAt(x, y) {
        if (x < 0 || x >= this.nx || y < 0 || y >= this.ny) 
            return 0x000000;
        // Mimic VPython: val = min(int(255*cells[c][r-1]),255) * (r>2)
        // TiledPlane will show cell (x,y) with color of cells[x][y], so we offset r-1 here
        const v = this._cells[x][Math.max(0, y - 1)] ?? 0;
        const val = Math.min(Math.floor(255 * v), 255) * (y > 2 ? 1 : 0);
        return this._palette[val] ?? 0x000000;
    }

    update() {
        // Double buffer like VPython old[][] copy
        const old = this._cells.map(col => [...col]);
        const nx = this.nx;
        const ny = this.ny;
        for (let row = 0; row < ny; row++) 
            for (let column = 0; column < nx; column++) {
                if (row === 0 && column > 5 && column < nx - 5) {
                    // bottom row fuel + random flicker
                    this._cells[column][row] = (old[column][1] ?? 0) + Math.random() * 0.9;
                    continue;
                } 
                const intensity = 4.1 + 0.3 * (Math.abs(column - nx / 2) / (nx / 2));
                const a = old[column - 1]?.[row - 1] ?? 0;
                const b = old[column]?.[row - 1] ?? 0;
                const c1 = old[column + 1]?.[row - 1] ?? 0;
                const d = old[column]?.[row - 2] ?? 0;
                this._cells[column][row] = (a + b + c1 + d) / intensity;
            }
    }
}


const NX = 200;
const NY = 140;
const cellSize = 2;
const fire = new Fire(NX, NY);
const view = new TiledPlane({
    cellSize: cellSize,
    colorMapper: new HexValueColorMapper(),
    opacity: 1
});

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
    .bind(fire.alwaysWith(view))
    .runsEvery(1 / 60)
    .onStep(() => fire.update())
    .onReset(() => fire.reset())
    .start();
