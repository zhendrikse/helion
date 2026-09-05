import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, Interval, Range, Slider
} from "../../../src/index.js";
import { Color } from "three";

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;

// Color mapping for potential: -V0/2 (blue) -> 0 (white) -> +V0/2 (red)
class PotentialColorMapper {
    // normalized is value/max via Interval, where 0 = -100, 1 = +100
    // Map -1..1 to blue->white->red
    map(value, target) {
        const normalized = (value + 100) / 200;
        const v = normalized * 2 - 1; // -100 ... 100
        if (v < 0)
            target.setRGB(1 + v * 0.5, 1 + v * 0.5, 1);
        else 
            target.setRGB(1, 1 - v * 0.5, 1 - v * 0.5);
    }
}

// Discrete potential field with fixed plates
class CapacitorField extends DiscreteScalarField {
    constructor(nx = N, ny = N) {
        super({ nx, ny });
        this._plateMask = Array.from({ length: nx }, () => Array(ny).fill(false));
        this._initPlates();
    }

    _initPlates() {
        const nx = this.nx, ny = this.ny;
        const plateHalfLen = Math.floor((L / h) / 2);
        const cx = Math.floor(nx / 2);
        const cy = Math.floor(ny / 2);
        const plateHalfGap = Math.floor((d / h) / 2);
        const yBottom = cy - plateHalfGap;
        const yTop = cy + plateHalfGap;

        for (let x = cx - plateHalfLen; x < cx + plateHalfLen; x++) {
            if (x < 0 || x >= nx) continue;
            this.setValueAt(x, yBottom, -V0 / 2);
            this.setValueAt(x, yTop, V0 / 2);
            this._plateMask[x][yBottom] = true;
            this._plateMask[x][yTop] = true;
        }
    }

    isFixed(x, y) {
        if (x < 0 || x >= this.nx || y < 0 || y >= this.ny) return false;
        return this._plateMask[x][y];
    }

    rangeAt() {
        // Potential range -100..100
        return new Interval(-V0 / 2, V0 / 2);
    }
}

const field = new CapacitorField(N, N);
const view = new TiledPlane({
    cellSize: 0.3,
    colorMapper: new PotentialColorMapper(),
    opacity: 1
});

// Simple Jacobi solver for Laplace's equation (like VPython solve_laplacian)
function solveLaplace(field, iterations = 50) {
    const nx = field.nx, ny = field.ny;
    const old = new Float32Array(field.data);
    for (let iter = 0; iter < iterations; iter++) {
        // copy old
        old.set(field.data);
        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                if (field.isFixed(x, y)) continue;
                const v = 0.25 * (old[(y - 1) * nx + x] + old[(y + 1) * nx + x] + old[y * nx + (x - 1)] + old[y * nx + (x + 1)]);
                field.setValueAt(x, y, v);
            }
    }
}

// Pre-solve a bit like VPython's 5000 iterations (progressive)
let solvedIterations = 0;
function solveSome() {
    if (solvedIterations < 5000) {
        solveLaplace(field, 100);
        solvedIterations += 100;
        // Update progress in infoPanel if needed
    }
}

const simulation = Simulation
    .with({
        htmlDivId: "nonIdealCapacitorContainer",
        camera: { position: new Vec3(0, 0, 35), orthographic: true },
        viewport: { aspectRatio: 1 },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: "<strong>🔋 Non-ideal capacitor</strong><br/>Laplace solver for potential, plates ±100V. Bottom/top plates at ±V0/2. Colors: blue (-), red (+)."
        }
    })
    .bind(field.alwaysWith(view))
    .onStep(() => {
        // Keep refining a bit each frame until 5000
        solveSome();
    })
    .append(new Slider("Iterations")
        .withRange(new Range(0, 5000, 100))
        .withValue(0)
        .addEventListener("input", e => {
            const target = Number(e.target.value);
            while (solvedIterations < target) solveSome();
            while (solvedIterations > target) {
                // reset and recompute up to target
                field.data.fill(0);
                field._initPlates();
                solvedIterations = 0;
                while (solvedIterations < target) solveSome();
            }
        }))
    .start();

simulation.frameSceneOn(view, { padding: 1.1, viewDirection: new Vec3(0, 0, 1) });

// Initial solve
solveLaplace(field, 500);
solvedIterations = 500;
