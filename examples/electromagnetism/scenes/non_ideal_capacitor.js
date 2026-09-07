import {
    Simulation, Vec3, Vec2, DiscreteScalarField, VectorField, TiledPlane, ArrowField2D,
    Interval, Range, Slider, FixedIntervalNormalizer, DirichletBoundaryCondition,
    JacobiSolver, ColorMapper
} from "../../../src/index.js";

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;
const potentialRangeInterval = new Interval(-V0 / 2, V0 / 2);
const plateHalfLen = Math.floor((L / h) / 2);
const plateHalfGap = Math.floor((d / h) / 2);
const cellSize = 0.3;

// Color mapping for potential: -V0/2 (red) -> 0 (yellow) -> +V0/2 (green)
class PotentialColorMapper extends ColorMapper {
    map(value, target) {
        if (value < 0.5)
            target.setRGB(1, 2 * value, 0);
        else
            target.setRGB(1 - 2 * (value - 0.5), 1, 0);
    }
}

class CapacitorBoundaryCondition extends DirichletBoundaryCondition {
    constructor() {
        const cx = Math.floor(N / 2);
        const cy = Math.floor(N / 2);
        const yBottom = cy - plateHalfGap;
        const yTop = cy + plateHalfGap;
        const isPlate = (x, y) =>
            x >= cx - plateHalfLen && x < cx + plateHalfLen && (y === yBottom || y === yTop);

        super({
            isFixed: isPlate,
            valueAt: (x, y) => y === yBottom ? -V0 / 2 : V0 / 2
        });
    }
}

class ElectricField extends VectorField {
    constructor(potentialField) {
        super();
        this._potentialField = potentialField;
        this._target = new Vec2();
    }

    sample(position, target = this._target) {
        const width = 0.5 * this._potentialField.nx * cellSize;
        const height = 0.5 * this._potentialField.ny * cellSize;

        const i = Math.round((position.x + width) / cellSize - 0.5);
        const j = Math.round((position.y + height) / cellSize - 0.5);

        if (i <= 0 || i >= this._potentialField.nx - 1 ||
            j <= 0 || j >= this._potentialField.ny - 1)
            return target.set(0, 0);

        const dVdx =
            (this._potentialField.valueAt(i + 1, j) -
             this._potentialField.valueAt(i - 1, j)) / (2 * h);

        const dVdy =
            (this._potentialField.valueAt(i, j + 1) -
             this._potentialField.valueAt(i, j - 1)) / (2 * h);

        return target.set(-dVdx, -dVdy);
    }
}

const field = new DiscreteScalarField({nx: N, ny: N});
const boundaryCondition = new CapacitorBoundaryCondition();
const solver = new JacobiSolver(boundaryCondition);
const electricField = new ElectricField(field);

const view = new TiledPlane({
    cellSize,
    colorMapper: new PotentialColorMapper(),
    normalizer: new FixedIntervalNormalizer(potentialRangeInterval),
    opacity: 1,
    opacityFunction: value => 2 * Math.abs(value - 0.5)
});

const arrowSpacing = 5;
const width = 0.5 * N * cellSize;
const height = 0.5 * N * cellSize;
const xPositions = [];
const yPositions = [];

for (let i = 2; i < N - 2; i += arrowSpacing)
    xPositions.push((i + 0.5) * cellSize - width);

for (let j = 2; j < N - 2; j += arrowSpacing)
    yPositions.push((j + 0.5) * cellSize - height);

const arrows = new ArrowField2D({
    xRange: xPositions,
    yRange: yPositions,
    scaleFactor: 0.2,
    magnitudeMap: magnitude => Math.log(1 + magnitude),
    colorMap: () => 0xffffff,
    size: 0.08,
    headLength: 0.08,
    headWidth: 0.05,
    lineWidth: 2,
    headStyle: "filled"
});

let solvedIterations = 0;
let iterationLimit = 5000;
let stepSize = 25;

const simulation = Simulation
    .with({
        htmlDivId: "nonIdealCapacitorContainer",
        camera: { orthographic: true },
        viewport: { aspectRatio: "1/1"  },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: "<strong>🔋 Non-ideal capacitor</strong><br/>Laplace solver for potential, plates ±100V. Bottom/top plates at ±V0/2. Colors: red (-), green (+)."
        }
    })
    .bind(field.alwaysWith(view))
    .bind(electricField.alwaysWith(arrows))
    .onStep(() => {
        if (solvedIterations >= iterationLimit)
            return;

        field.evolve(solver, stepSize);
        solvedIterations += stepSize;
        simulation.setTextTitle(`Iterations: ${solvedIterations}`);
    })
    .append(new Slider("Iterations")
        .withRange(new Range(0, 15000, 100))
        .withValue(iterationLimit)
        .onChange(event => {
            solvedIterations = 0;
            iterationLimit = Number(event.target.value);
            field.reset();
        }))
    .frameSceneOn(view, { padding: 1.15, viewDirection: new Vec3(0, 0, 1) })
    .start();
