import {
    Simulation, Vec3, DiscreteScalarField, ArrowField2D, Colour,
    Interval, Range, Slider, FixedIntervalNormalizer, DirichletBoundaryCondition,
    JacobiSolver, ColorMapper, Checkbox, Arrow2D, Button, ElectricField, DiscreteFieldSurfaceView,
    StreamlinesView, MathPhysicsModelBehavior, Vec2
} from '../../../src/index.js';

const N = 201;
const h = 1e-2 / (N - 1);
const L = 4e-3;
const d = 1e-3;
const V0 = 200;
const potentialRangeInterval = new Interval(-V0 / 2, V0 / 2);
const plateHalfLen = Math.floor((L / h) / 2);
const plateHalfGap = Math.floor((d / h) / 2);
const gridSpacing = 0.3;

// Color mapping for potential: -V0/2 (red) -> 0 (yellow) -> +V0/2 (green)
class PotentialColorMapper extends ColorMapper {
    map(/** @type {number} */ value, /** @type {Color} */ target) {
        value < 0.5 ? target.setRGB(1, 2 * value, 0): target.setRGB(1 - 2 * (value - 0.5), 1, 0);
    }
}

class DipoleBoundaryCondition extends DirichletBoundaryCondition {
    constructor(/** @type {number} */ separation = d) {
        const cx = Math.floor(N / 2);
        const cy = Math.floor(N / 2);

        const separationInCells = Math.round(separation / h);
        const positive = [cx + separationInCells, cy];
        const negative = [cx - separationInCells, cy];

        super({
            isFixed: (x, y) =>
                ((x - positive[0]) * (x - positive[0]) + (y - positive[1]) * (y - positive[1]) <= 16) ||
                ((x - negative[0]) * (x - negative[0]) + (y - negative[1]) * (y - negative[1]) <= 16),

            valueAt: (x, y) =>
                ((x - positive[0]) * (x - positive[0]) + (y - positive[1]) * (y - positive[1]) <= 16) ? +V0 / 2 : -V0 / 2
        });
    }
}

class ChargedRingBoundaryCondition extends DirichletBoundaryCondition {
    constructor(/** @type {number} */ radius = L * .75) {
        const cx = Math.floor(N / 2);
        const cy = Math.floor(N / 2);
        const ringRadiusCells = Math.round(radius / h);
        const ringThickness = 1.5; // cells

        super({
            isFixed: (x, y) => {
                const dx = x - cx;
                const dy = y - cy;
                const distSq = dx * dx + dy * dy;
                const rOuter = ringRadiusCells + ringThickness;
                const rInner = ringRadiusCells - ringThickness;
                // Only the ring itself is fixed potential (hollow ring)
                return distSq >= rInner * rInner && distSq <= rOuter * rOuter;
            },

            valueAt: (x, y) => V0 / 2.75
        });
    }
}

class CapacitorBoundaryCondition extends DirichletBoundaryCondition {
    constructor() {
        const cx = Math.floor(N / 2);
        const cy = Math.floor(N / 2);
        const yBottom = cy - plateHalfGap;
        const yTop = cy + plateHalfGap;
        const isPlate = (/** @type {number} */ x, /** @type {number} */ y) =>
            x >= cx - plateHalfLen && x < cx + plateHalfLen && (y === yBottom || y === yTop);

        super({
            isFixed: isPlate,
            valueAt: (x, y) => y === yBottom ? -V0 / 2 : V0 / 2
        });
    }
}

// Adapter to make ElectricField compatible with StreamlinesView
class ElectricFieldStreamlinesAdapter extends MathPhysicsModelBehavior {
    constructor(electricField) {
        super();
        this._electricField = electricField;
        this.nx = electricField._potentialField.nx;
        this.ny = electricField._potentialField.ny;
        this.gridSpacing = electricField._gridSpacing;
    }

    // The field lines on the borders are so small, we don't need clipping here
    contains = (/** @type {Vec2} */ position) => true;

    sample = (/** @type {Vec2} */ position, /** @type {Vec2} */ target) => this._electricField.sample(position, target);
}

const potential = new DiscreteScalarField({nx: N, ny: N});
const boundaryCondition = new CapacitorBoundaryCondition();
const solver = new JacobiSolver(boundaryCondition);
const electricField = new ElectricField({potential, gridSpacing, derivativeSpacing: h });
const electricFieldAdapter = new ElectricFieldStreamlinesAdapter(electricField);

const streamlinesView = new StreamlinesView({
    numberOfSegments: 20,
    seedSpacing: 5,
    scale: 4e-6,
    color: new Colour(0x090909)
});
streamlinesView.visible = true;

const potentialView = new DiscreteFieldSurfaceView({
    scale: gridSpacing,
    colorMapper: new PotentialColorMapper(),
    normalizer: new FixedIntervalNormalizer(potentialRangeInterval),
    opacityFunction: value => 2 * Math.abs(value - 0.5)
});

const arrowSpacing = 1.5;
const width = 0.5 * N * gridSpacing;
const height = 0.5 * N * gridSpacing;
const arrowField = new ArrowField2D({
    xRange: new Range((2 + .5) * gridSpacing - width, (N - 2 + .5) * gridSpacing - width, arrowSpacing),
    yRange: new Range((2 + .5) * gridSpacing - height, (N - 2 + .5) * gridSpacing - height, arrowSpacing),
    scaleFactor: 1,
    magnitudeMap: m => Math.min(m * 1e-4, 2.5),
    size: 0.25,
    headLength: 0.5,
    headWidth: 0.4,
    colorMap: (_dir, _mag) => new Colour(0x666666),
    headStyle: Arrow2D.HeadStyle.Filled,
    visible: false
});

let solvedIterations = 0;
let iterationLimit = 9000;
let stepSize = 25;

const reset = () => {
    solvedIterations = 0;
    potential.reset();
};
const simulation = Simulation
    .with({
        htmlDivId: 'potentialFieldContainer',
        camera: { orthographic: true },
        viewport: { parameterMenuCollapsed: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>💪 Potential fields</strong><br/>' +
                'Laplace solver for potentials, charges ±100V.<br/>' +
                'Colors: <span style=\'color: #ff0000\'>red (-)</span>, <span style=\'color: #00ff00\'>green (+)</span>.<br/>' +
                'Electric field: $$\\overrightarrow{E}=-\\overrightarrow{\\nabla}V$$'
        }
    })
    .bind(potential.alwaysWith(potentialView))
    .bind(electricField.alwaysWith(arrowField))
    .bind(electricFieldAdapter.alwaysWith(streamlinesView))
    .onStep(() => {
        if (solvedIterations >= iterationLimit)
            return;

        potential.evolve(solver, stepSize);
        solvedIterations += stepSize;
        simulation.setBottomText(`Iterations: ${solvedIterations}`);
    })
    .append(new Slider('Iterations')
        .withRange(new Range(0, 15000, 100))
        .withValue(iterationLimit)
        .onChange(value => {
            iterationLimit = value;
            reset();
        }))
    .append(new Checkbox('Electric field arrows ')
        .on(arrowField)
        .withProperty('visible')
    )
    .append(new Checkbox('Electric field lines ')
        .on(streamlinesView)
        .withProperty('visible')
    )
    .append(new Button()
        .withText('🔋 Capacitor')
        .addEventListener('click', () => {
            solver.boundaryCondition = new CapacitorBoundaryCondition();
            reset();
        }).togetherWith(new Button()
            .withText('⚡ Dipole')
            .addEventListener('click', () => {
                solver.boundaryCondition = new DipoleBoundaryCondition();
                reset();
            })
        .togetherWith(new Button()
            .withText('💍 Charged Ring')
            .addEventListener('click', () => {
                solver.boundaryCondition = new ChargedRingBoundaryCondition();
                reset();
            })))
    )
    .frameSceneOn(potentialView, { padding: 1.15, viewDirection: new Vec3(0, 0, 1) })
    .start();
