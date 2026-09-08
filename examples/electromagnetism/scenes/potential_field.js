import {
    Simulation, Vec3, DiscreteScalarField, TiledPlane, ArrowField2D,
    Interval, Range, Slider, FixedIntervalNormalizer, DirichletBoundaryCondition,
    JacobiSolver, ColorMapper, Checkbox, Arrow2D, Button, ElectricField
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

class DipoleBoundaryCondition extends DirichletBoundaryCondition {
    constructor(separation = d/2) {
        const cx = Math.floor(N / 2);
        const cy = Math.floor(N / 2);

        const separationInCells = Math.round(separation / h);
        const positive = [cx + separationInCells, cy];
        const negative = [cx - separationInCells, cy];

        super({
            isFixed: (x, y) =>
                (Math.abs(x - positive[0]) <= 1 && Math.abs(y - positive[1]) <= 1) ||
                (Math.abs(x - negative[0]) <= 1 && Math.abs(y - negative[1]) <= 1),

            valueAt: (x, y) =>
                Math.abs(x - positive[0]) <=1 && Math.abs(y - positive[1]) <=1 ? +V0 / 2 : -V0 / 2
        });
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

const potential = new DiscreteScalarField({nx: N, ny: N});
const boundaryCondition = new CapacitorBoundaryCondition();
const solver = new JacobiSolver(boundaryCondition);
const electricField = new ElectricField({
    potential, 
    gridSpacing: cellSize, 
    derivativeSpacing: h
});

const view = new TiledPlane({
    cellSize,
    colorMapper: new PotentialColorMapper(),
    normalizer: new FixedIntervalNormalizer(potentialRangeInterval),
    opacity: 1,
    opacityFunction: value => 2 * Math.abs(value - 0.5)
});

const arrowSpacing = 1.5;
const width = 0.5 * N * cellSize;
const height = 0.5 * N * cellSize;
const arrows = new ArrowField2D({
    xRange: new Range((2 + .5) * cellSize - width, (N - 2 + .5) * cellSize - width, arrowSpacing),
    yRange: new Range((2 + .5) * cellSize - height, (N - 2 + .5) * cellSize - height, arrowSpacing),
    scaleFactor: 0.2,
    size: 0.25,
    headLength: 0.5,
    headWidth: 0.4,
    colorMap: (dir, mag) => 0x333333,
    headStyle: Arrow2D.HeadStyle.Filled,
    visible: false
});

let solvedIterations = 0;
let iterationLimit = 5000;
let stepSize = 25;

const reset = () => {
    solvedIterations = 0;
    potential.reset(); 
}
const simulation = Simulation
    .with({
        htmlDivId: "potentialFieldContainer",
        camera: { orthographic: true },
        viewport: { aspectRatio: "1/1"  },
        headUpDisplay: { enabled: false },
        parameterMenuCollapsed: false,
        infoPanel: {
            text: "<strong>💪 Potential fields</strong><br/>" +
            "Laplace solver for potentials, charges ±100V.<br/>" + 
            "Colors: <span style=\"color: #ff0000\">red (-)</span>, <span style=\"color: #00ff00\">green (+)</span>.<br/>" +
            "Electric field arrows $$\\overrightarrow{E}=-\\overrightarrow{\\nabla}V$$"
        }
    })
    .bind(potential.alwaysWith(view))
    .bind(electricField.alwaysWith(arrows))
    .onStep(() => {
        if (solvedIterations >= iterationLimit)
            return;

        potential.evolve(solver, stepSize);
        solvedIterations += stepSize;
        simulation.setTextTitle(`Iterations: ${solvedIterations}`);
    })
    .append(new Slider("Iterations")
        .withRange(new Range(0, 15000, 100))
        .withValue(iterationLimit)
        .onChange(event => {
            iterationLimit = Number(event.target.value);
            reset();
        }))
    .append(new Checkbox("Electric field arrows ")
        .on(arrows)
        .withProperty("visible")
    )
    .append(new Button()
        .withText("🔋 Capacitor")
        .addEventListener("click", () => {
            solver.boundaryCondition = new CapacitorBoundaryCondition();
            reset(); 
        }).togetherWith(new Button()
        .withText("⚡ Dipole")
        .addEventListener("click", () => { 
            solver.boundaryCondition = new DipoleBoundaryCondition();
            reset(); 
        }))
    )
    .frameSceneOn(view, { padding: 1.15, viewDirection: new Vec3(0, 0, 1) })
    .start();
    