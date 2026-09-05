import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, Interval, Range, Slider
} from "../../../src/index.js";
import { Arrow2D } from "../../../src/view/2d/primitives.js";
import { BoxGeometry, Color, Mesh, MeshBasicMaterial } from "three";

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;

// Match the original Web VPython potential colors:
// -100 V -> bright red, 0 V -> bright yellow, +100 V -> bright green.
class PotentialColorMapper {
    map(value, target) {
        const v = Math.max(0, Math.min(1, value));
        if (v < 0.5) {
            const t = 2 * v;
            target.setRGB(1, t, 0);
        } else {
            const t = 2 * (v - 0.5);
            target.setRGB(1 - t, 1, 0);
        }
    }
}

// Discrete potential field with fixed capacitor plates.
class CapacitorField extends DiscreteScalarField {
    constructor(nx = N, ny = N) {
        super({nx, ny});
        this._plateMask = Array.from({length: nx}, () => Array(ny).fill(false));
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
        return new Interval(-V0 / 2, V0 / 2);
    }
}

const field = new CapacitorField(N, N);

const view = new TiledPlane({
    cellSize: 0.3,
    colorMapper: new PotentialColorMapper(),
    normalizer: new (class extends Object {
        normalize(value) {
            return new Interval(-V0 / 2, V0 / 2).normalize(value);
        }
    })(),
    opacity: 1
});

// Field arrows. Arrow2D is deliberately kept as the generic visual primitive;
// this small model only supplies the position and vector required by it.
class FieldArrowModel {
    constructor(position, axis) {
        this.position = position;
        this.axis = axis;
    }
}

class ElectricFieldArrows extends Mesh {
    constructor({color = 0x111111, stride = 8, scale = 0.004} = {}) {
        super();
        this._color = color;
        this._stride = stride;
        this._scale = scale;
        this._arrows = [];
    }

    initialize(model) {
        this.clear();
        this._arrows = [];

        for (let y = 1; y < model.ny - 1; y += this._stride) {
            for (let x = 1; x < model.nx - 1; x += this._stride) {
                const arrow = new Arrow2D({
                    color: this._color,
                    size: 0.07,
                    headLength: 0.07,
                    headWidth: 0.045,
                    lineWidth: 1.5,
                    headStyle: Arrow2D.HeadStyle.Open
                });
                this.add(arrow);
                this._arrows.push({arrow, x, y});
            }
        }
    }

    synchronizeWith(model) {
        const nx = model.nx;
        for (const {arrow, x, y} of this._arrows) {
            const xm = model.valueAt(x - 1, y);
            const xp = model.valueAt(x + 1, y);
            const ym = model.valueAt(x, y - 1);
            const yp = model.valueAt(x, y + 1);

            // E = -grad(V) / h. Convert the physical field to the visual
            // coordinate system used by TiledPlane.
            const ex = -(xp - xm) / (2 * h);
            const ey = -(yp - ym) / (2 * h);

            const position = {
                x: (x + 0.5) * view._cellSize - 0.5 * nx * view._cellSize,
                y: (y + 0.5) * view._cellSize - 0.5 * model.ny * view._cellSize
            };
            const axis = {x: ex * this._scale, y: ey * this._scale};
            arrow.setVector(position, axis);
        }
    }
}

// Simple Jacobi solver for Laplace's equation.
function solveLaplace(field, iterations = 50) {
    const nx = field.nx, ny = field.ny;
    const old = new Float32Array(field.data);
    for (let iter = 0; iter < iterations; iter++) {
        old.set(field.data);
        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                if (field.isFixed(x, y)) continue;
                const v = 0.25 * (
                    old[(y - 1) * nx + x] +
                    old[(y + 1) * nx + x] +
                    old[y * nx + (x - 1)] +
                    old[y * nx + (x + 1)]
                );
                field.setValueAt(x, y, v);
            }
    }
}

const arrows = new ElectricFieldArrows({stride: 8, scale: 0.004});
const plates = new Mesh(
    new BoxGeometry(2 * (L / h) * 0.3, 0.12, 0.08),
    new MeshBasicMaterial({color: 0xffff00})
);

let solvedIterations = 0;
function solveSome() {
    if (solvedIterations < 5000) {
        solveLaplace(field, 100);
        solvedIterations += 100;
    }
}

const simulation = Simulation
    .with({
        htmlDivId: "nonIdealCapacitorContainer",
        camera: {position: new Vec3(0, 0, 35), orthographic: true},
        viewport: {aspectRatio: 1},
        headUpDisplay: {enabled: false},
        infoPanel: {
            text: "<strong>🔋 Non-ideal capacitor</strong><br/>Laplace solver for potential, plates ±100V. Colors: red (-), yellow (0), green (+)."
        }
    })
    .bind(field.alwaysWith(view))
    .append(arrows)
    .append(plates)
    .onStep(() => solveSome())
    .append(new Slider("Iterations")
        .withRange(new Range(0, 5000, 100))
        .withValue(0)
        .addEventListener("input", e => {
            const target = Number(e.target.value);
            while (solvedIterations < target) solveSome();
            while (solvedIterations > target) {
                field.data.fill(0);
                field._plateMask = Array.from({length: field.nx}, () => Array(field.ny).fill(false));
                field._initPlates();
                solvedIterations = 0;
                while (solvedIterations < target) solveSome();
            }
            arrows.synchronizeWith(field);
        }))
    .start();

simulation.frameSceneOn(view, {padding: 1.1, viewDirection: new Vec3(0, 0, 1)});
solveLaplace(field, 500);
solvedIterations = 500;
arrows.synchronizeWith(field);
