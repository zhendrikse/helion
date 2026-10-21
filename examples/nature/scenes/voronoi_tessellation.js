import {
    Range, Bindable, Simulation, Slider, DropdownMenu,
    BindableCollection, ViewsCollection, Colour, ColorMappers, PolygonPrimitive, Vec2
} from '../../../src/index.js';

const DEFAULT_SEED_COUNT = 100;
const DOMAIN_WIDTH = 18;
const DOMAIN_HEIGHT = 18;
const GROWTH_SPEED = 4.5;
const EDGE_EPSILON = 1e-5;

let seedCount = DEFAULT_SEED_COUNT;
let growthSpeed = GROWTH_SPEED;
let seeds = [];
let voronoiCells = []; // each cell: { vertices: [], seed, hue, seedIndex }
let maximumGrowthRadius = 0;
let isGrowing = true;

class VoronoiCellModel extends Bindable {
    constructor({ vertices = [], seedIndex = 0, hue = 0 } = {}) {
        super();
        this.vertices = vertices;
        this.seedIndex = seedIndex;
        this.hue = hue;
    }
}

function randomSeeds(count) {
    return Array.from({ length: count }, () => new Vec2(
        (Math.random() - 0.5) * DOMAIN_WIDTH * 0.92,
        (Math.random() - 0.5) * DOMAIN_HEIGHT * 0.92
    ));
}

function clipPolygon(polygon, a, b, c) {
    const result = [];
    for (let i = 0; i < polygon.length; i++) {
        const current = polygon[i];
        const next = polygon[(i + 1) % polygon.length];
        const currentValue = a * current.x + b * current.y - c;
        const nextValue = a * next.x + b * next.y - c;
        const currentInside = currentValue <= EDGE_EPSILON;
        const nextInside = nextValue <= EDGE_EPSILON;

        if (currentInside)
            result.push(current);

        if (currentInside !== nextInside) {
            const t = currentValue / (currentValue - nextValue);
            result.push(new Vec2(current.x + t * (next.x - current.x), current.y + t * (next.y - current.y)));
        }
    }
    return result;
}

function buildVoronoiCells() {
    maximumGrowthRadius = 0;

    seeds.forEach((seed, seedIndex) => {
        let polygon = [
            { x: -DOMAIN_WIDTH / 2, y: -DOMAIN_HEIGHT / 2 },
            { x: DOMAIN_WIDTH / 2, y: -DOMAIN_HEIGHT / 2 },
            { x: DOMAIN_WIDTH / 2, y: DOMAIN_HEIGHT / 2 },
            { x: -DOMAIN_WIDTH / 2, y: DOMAIN_HEIGHT / 2 }
        ];

        seeds.forEach((other, otherIndex) => {
            if (seedIndex === otherIndex || polygon.length === 0)
                return;

            // Points in this cell are closer to seed than to other:
            // 2 p·(other-seed) <= |other|² - |seed|².
            const a = 2 * (other.x - seed.x);
            const b = 2 * (other.y - seed.y);
            const c = other.x * other.x + other.y * other.y - seed.x * seed.x - seed.y * seed.y;
            polygon = clipPolygon(polygon, a, b, c);
        });

        if (polygon.length >= 3) {
            for (const vertex of polygon)
                maximumGrowthRadius = Math.max(maximumGrowthRadius, Math.hypot(vertex.x - seed.x, vertex.y - seed.y));

            voronoiCells.push({
                vertices: polygon,
                seed,
                seedIndex,
                hue: seedIndex / seeds.length
            });
        }
    });
}

function reset() {
    cells.reset();
    seeds = randomSeeds(seedCount);
    isGrowing = true;
    buildVoronoiCells();
}

const cells = new BindableCollection();

function createCellViews() {
    cells.reset();
    for (const cell of voronoiCells) {
        const model = new VoronoiCellModel({
            vertices: cell.vertices,
            seedIndex: cell.seedIndex,
            hue: cell.hue
        });
        cells.add(model);
    }
    updateCellColors()
}

let colorMapper = ColorMappers.get(ColorMappers.Scientific);
function updateCellColors() {
    cells.forEach(binding => {
        const model = binding.model;
        // Color based on distance from seed or just use hue
        const color = new Colour();
        colorMapper.map(model.hue, color);
        binding.view.fillColor = color;
    });
}

reset();
createCellViews();
const cellViews = ViewsCollection.of(PolygonPrimitive).with({
    borderColor: Colour.White,
    borderWidth: 0.02
});

Simulation
    .with({
        htmlDivId: 'voronoiTessellationContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: { orthographic: true, controls: false },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🧫 Voronoi tessellation</strong><br/>' +
                'Random seeds grow radially. Wherever two growth fronts meet, a Voronoi edge appears. ' +
                'Each cell contains the points closest to its seed.'
        }
    })
    .bind(cells.alwaysWith(cellViews))
    .onReset(() => {
        reset();
        createCellViews();
    })
    .frameSceneOn(cellViews, {padding: 1.0})
    .append(new Slider('🧫 Number of seeds')
        .withRange(new Range(4, 250, 0.95))
        .withValue(seedCount)
        .onChange(value => {
            seedCount = Math.round(value);
            reset();
            createCellViews();
        }))
    .append(new Slider('🏃 Growth speed')
        .withRange(new Range(0.5, 10, 0.5))
        .withValue(growthSpeed)
        .onInput(value => growthSpeed = value))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Scientific)
        .onChange(value => {
            colorMapper = ColorMappers.get(value);
            updateCellColors();
        }))
    .start();

updateCellColors();
