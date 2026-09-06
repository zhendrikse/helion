import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, Interval, Range, Slider, FixedIntervalNormalizer,
    DirichletBoundaryCondition, JacobiSolver, ColorMapper
} from "../../../src/index.js";

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;
const potentialRangeInterval = new Interval(-V0 / 2, V0 / 2);
const plateHalfLen = Math.floor((L / h) / 2);
const plateHalfGap = Math.floor((d / h) / 2);

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

const field = new DiscreteScalarField({nx: N, ny: N});
const boundaryCondition = new CapacitorBoundaryCondition();
const solver = new JacobiSolver(boundaryCondition);
const view = new TiledPlane({
    cellSize: 0.3,
    colorMapper: new PotentialColorMapper(),
    normalizer: new FixedIntervalNormalizer(potentialRangeInterval),
    opacity: 1,
    opacityFunction: value => 2 * Math.abs(value - 0.5)
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
