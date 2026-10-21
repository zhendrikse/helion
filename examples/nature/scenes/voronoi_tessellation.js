import {
    Range, Bindable, Simulation, Slider, DropdownMenu, BindableCollection, ViewsCollection,
    Colour, ColorMappers, PolygonView, Vec2, Button, RadialSymmetricBody, Circle, Polygon
} from '../../../src/index.js';

const DOMAIN_WIDTH = 18;
const DOMAIN_HEIGHT = 18;
const EDGE_EPSILON = 1e-5;
const CIRCLE_SEGMENTS = 32;

let seedCount = 50;
let growthSpeed = 4.5;
let growthRadius = 0.125;
let maximumGrowthRadius = 0;
/** @type {{model: VoronoiCellModel, seed: RadialSymmetricBody, polygon: Polygon}[]} */
let growthCells = [];

class VoronoiCellModel extends Bindable {
    constructor({ polygon, seedIndex = 0 } = {}) {
        super();
        this.polygon = polygon;
        this.seedIndex = seedIndex;
    }
}

function clipPolygon(polygon, r, c) {
    const result = [];
    for (let i = 0; i < polygon.vertexCount; i++) {
        const current = polygon.vertexAt(i);
        const next = polygon.vertexAt((i + 1) % polygon.vertexCount);
        const currentValue = r.x * current.x + r.y * current.y - c;
        const nextValue = r.x * next.x + r.y * next.y - c;
        const currentInside = currentValue <= EDGE_EPSILON;
        const nextInside = nextValue <= EDGE_EPSILON;

        if (currentInside)
            result.push(current);

        if (currentInside !== nextInside) {
            const t = currentValue / (currentValue - nextValue);
            result.push(new Vec2(current.x, current.y).add(next.clone().sub(current).multiplyScalar(t)));
        }
    }
    return new Polygon(result);
}

/** @param {RadialSymmetricBody[]} seeds */
function buildVoronoiCells(seeds) {
    seeds.forEach((seed, seedIndex) => {
        let polygon = new Polygon([
            new Vec2(-DOMAIN_WIDTH, -DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2( DOMAIN_WIDTH, -DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2( DOMAIN_WIDTH,  DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2(-DOMAIN_WIDTH,  DOMAIN_HEIGHT).multiplyScalar(0.5)
        ]);

        seeds.forEach((other, otherIndex) => {
            if (seedIndex === otherIndex || polygon.vertexCount === 0)
                return;

            // Points in this cell are closer to seed than to other:
            // 2 p·(other-seed) <= |other|² - |seed|².
            const r2 = seed.positionVectorTo(other).multiplyScalar(2);
            const c = other.position.dot(other.position) - seed.position.dot(seed.position);
            polygon = clipPolygon(polygon, r2, c);
        });

        if (polygon.vertexCount >= 3) {
            for (const vertex of polygon)
                maximumGrowthRadius = Math.max(maximumGrowthRadius, Math.hypot(vertex.x - seed.position.x, vertex.y - seed.position.y));

            const model = new VoronoiCellModel({ polygon, seedIndex: seedIndex });
            cells.add(model);
            cellCores.add(seed);
            growthCells.push({ model, seed, polygon });
        }
    });

    simulation.bind(cells.alwaysWith(cellViews));
    simulation.bind(cellCores.onceWith(cellCoresView));
}

const cells = new BindableCollection();
const cellCores = new BindableCollection();
const cellViews = ViewsCollection.of(PolygonView).with({
    borderColor: Colour.White,
    borderWidth: 0.02
});
const cellCoresView = ViewsCollection.of(Circle);

let seeds;
function reset() {
    growthCells = [];
    cells.reset();
    cellCores.reset();
    cellCoresView.reset();
    cellViews.reset();
    maximumGrowthRadius = 0;

    seeds = Array.from({ length: seedCount }, () => new RadialSymmetricBody({
        position: new Vec2(
            (Math.random() - 0.5) * DOMAIN_WIDTH * 0.92,
            (Math.random() - 0.5) * DOMAIN_HEIGHT * 0.92
        ),
        radius: .125
    }));
    growthRadius = 0.125;
    buildVoronoiCells(seeds);
    // Update views
    cells.forEach((binding, index) => binding.view.visible = index < seedCount);
    cellCores.forEach((binding, index) => binding.view.visible = index < seedCount);
    updateCellColors();
}

function updateGrowthGeometry() {
    for (const cell of growthCells) {
        let polygon = cell.polygon;

        // Intersect the final Voronoi cell with an expanding regular polygon
        // approximating a circle centered on the cell nucleus.
        for (let i = 0; i < CIRCLE_SEGMENTS && polygon.vertexCount > 0; i++) {
            const angle = (2 * Math.PI * i) / CIRCLE_SEGMENTS;
            const normal = new Vec2(Math.cos(angle), Math.sin(angle));
            const c = growthRadius + normal.dot(cell.seed.position);
            polygon = clipPolygon(polygon, normal, c);
        }

        cell.model.polygon = polygon;
    }
}

let colorMapper = ColorMappers.get(ColorMappers.Gradient);
function updateCellColors() {
    const color = new Colour();
    cells.forEach(binding => {
        colorMapper.map((binding.model.seedIndex + 2) / seedCount, color);
        binding.view.fillColor = color;
    });
}

const simulation = Simulation
    .with({
        htmlDivId: 'voronoiTessellationContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: { orthographic: true, controls: false },
        lighting: { enabled: false },
        headUpDisplay: false,
        infoPanel: {
            text: '<strong>🧫 Voronoi tessellation</strong><br/>' +
                'Random seeds grow radially. Wherever two growth fronts meet, a Voronoi edge appears. ' +
                'Each cell contains the points closest to its seed.'
        }
    })
    .onReset(reset)
    .runsEvery(0.02)
    .onStep((_clock, dt) => {
        if (growthRadius >= maximumGrowthRadius)
            return;

        growthRadius = Math.min(maximumGrowthRadius, growthRadius + growthSpeed * dt * .25);
        updateGrowthGeometry();
    })
    .append(new Slider('🧫 Number of seeds')
        .withRange(new Range(4, 250, 0.95))
        .withValue(seedCount)
        .onChange(value => {
            seedCount = Math.round(value);
            reset();
        }))
    .append(new Slider('🏃 Growth speed')
        .withRange(new Range(0.5, 10, 0.5))
        .withValue(growthSpeed)
        .onInput(value => growthSpeed = value))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Gradient)
        .onChange(value => {
            colorMapper = ColorMappers.get(value);
            updateCellColors();
        }))
    .append(new Button().withText("Reset").onClick(reset));

reset();
updateCellColors();
simulation.frameSceneOn(cellViews, { padding: 1.0 }).start()
