import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, Interval, Range, Slider, FixedIntervalNormalizer,
    Transformation
} from "../../../src/index.js";
import { Solver } from "../../../src/model/math/numerics/solvers/solvers.js";

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;
const potentialRangeInterval = new Interval(-V0 / 2, V0 / 2);
const plateHalfLen = Math.floor((L / h) / 2);
const plateHalfGap = Math.floor((d / h) / 2);

// Color mapping for potential: -V0/2 (blue) -> 0 (white) -> +V0/2 (red)
class PotentialColorMapper {
    // normalized is value/max via Interval, where 0 = -100, 1 = +100
    // Map -1..1 to blue->white->red
    map(value, target) {
        if (value < 0.5)
            target.setRGB(1, 2 * value, 0);
        else
            target.setRGB(1 - 2 * (value - 0.5), 1, 0);
    }
}

class CapacitorPotential extends Transformation {
    /**
     * @param {DiscreteScalarField} field 
     */
    applyTo(field) {
        const cx = Math.floor(field.nx / 2);
        const cy = Math.floor(field.ny / 2);
        const yBottom = cy - plateHalfGap;
        const yTop = cy + plateHalfGap;

        for (let x = cx - plateHalfLen; x < cx + plateHalfLen; x++) {
            field.setValueAt(x, yBottom, -V0 / 2);
            field.setValueAt(x, yTop, V0 / 2);
        }
    }
}

class CapacitorBoundaryCondition extends Transformation {
    /**
     * @param {DiscreteScalarField} field 
     */
    constructor(field) {
        super();
        this._plateMask = Array.from({ length: field.nx }, () => Array(field.ny).fill(false));
        const cx = Math.floor(field.nx / 2);
        const cy = Math.floor(field.ny / 2);
        const yBottom = cy - plateHalfGap;
        const yTop = cy + plateHalfGap;

        for (let x = cx - plateHalfLen; x < cx + plateHalfLen; x++) {
            this._plateMask[x][yBottom] = true;
            this._plateMask[x][yTop] = true;
        }
    }

    isFixed(x, y) {
        return this._plateMask[x][y];
    }
}

// Simple Jacobi solver for Laplace's equation
class JacobiSolver extends Solver {
    constructor(boundaryCondition) {
        super();
        this._boundaryCondition = boundaryCondition;
    }

    /**
     * @param {DiscreteScalarField} field
     * @param {number} increment 
     */
    step(field, increment) {
        const nx = field.nx, ny = field.ny;
        const old = new Float32Array(field.data);
        const boundaryCondition = this._boundaryCondition;
        for (let iter = 0; iter < increment; iter++) {
            old.set(field.data); // copy old
            for (let y = 1; y < ny - 1; y++)
                for (let x = 1; x < nx - 1; x++) {
                    if (boundaryCondition.isFixed(x, y)) continue;
                    const v = 0.25 * (old[(y - 1) * nx + x] + old[(y + 1) * nx + x] + old[y * nx + (x - 1)] + old[y * nx + (x + 1)]);
                    field.setValueAt(x, y, v);
                }
        }
    }
}

const field = new DiscreteScalarField({nx: N, ny: N});
field.apply(new CapacitorPotential());
const boundaryCondition = new CapacitorBoundaryCondition(field);
const solver = new JacobiSolver(boundaryCondition);
const view = new TiledPlane({
    cellSize: 0.3,
    colorMapper: new PotentialColorMapper(),
    normalizer: new FixedIntervalNormalizer(potentialRangeInterval),
    opacity: 1
});

let solvedIterations = 0;
let iterationLimit = 5000;
let stepSize = 25;
function solverStep() {
    if (solvedIterations >= iterationLimit)
        return;

    field.evolve(solver, stepSize);
    solvedIterations += stepSize;
    simulation.setTextTitle(`Iterations: ${solvedIterations}`)
}

const simulation = Simulation
    .with({
        htmlDivId: "nonIdealCapacitorContainer",
        camera: { position: new Vec3(0, 0, 35), orthographic: true },
        viewport: { aspectRatio: 1 },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: "<strong>🔋 Non-ideal capacitor</strong><br/>Laplace solver for potential, plates ±100V. Bottom/top plates at ±V0/2. Colors: green (-), red (+)."
        }
    })
    .bind(field.alwaysWith(view))
    .onStep(() => solverStep())
    .append(new Slider("Iterations")
        .withRange(new Range(0, 10000, 100))
        .withValue(iterationLimit)
        .addEventListener("change", e => {
            solvedIterations = 0;
            iterationLimit = Number(e.target.value);
        }))
    .frameSceneOn(view, { padding: 1.15, viewDirection: new Vec3(0, 0, 1) })
    .start();

