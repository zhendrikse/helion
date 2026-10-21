import {
    Range, Bindable, Simulation, Slider, DropdownMenu, BindableCollection, ViewsCollection,
    Colour, ColorMappers, PolygonPrimitive, Vec2, Button, RadialSymmetricBody, Circle
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

class VoronoiCellModel extends Bindable {
    constructor({ vertices = [], seedIndex = 0, hue = 0 } = {}) {
        super();
        this.vertices = vertices;
        this.seedIndex = seedIndex;
        this.hue = hue;
    }
}

function randomSeeds(count) {
    return Array.from({ length: count }, () => new RadialSymmetricBody({
        position: new Vec2(
            (Math.random() - 0.5) * DOMAIN_WIDTH * 0.92,
            (Math.random() - 0.5) * DOMAIN_HEIGHT * 0.92
            ),
        radius: .1
    }))
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
            result.push(new Vec2(current.x, current.y).add(next.clone().sub(current).multiplyScalar(t)));
        }
    }
    return result;
}

function buildVoronoiCells() {
    voronoiCells = [];
    maximumGrowthRadius = 0;

    seeds.forEach((seed, seedIndex) => {
        let polygon = [
            new Vec2(-DOMAIN_WIDTH, -DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2( DOMAIN_WIDTH, -DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2( DOMAIN_WIDTH,  DOMAIN_HEIGHT).multiplyScalar(0.5),
            new Vec2(-DOMAIN_WIDTH,  DOMAIN_HEIGHT).multiplyScalar(0.5)
        ];

        seeds.forEach((other, otherIndex) => {
            if (seedIndex === otherIndex || polygon.length === 0)
                return;

            // Points in this cell are closer to seed than to other:
            // 2 p·(other-seed) <= |other|² - |seed|².
            const a = 2 * (other.position.x - seed.position.x);
            const b = 2 * (other.position.y - seed.position.y);
            const c = other.position.dot(other.position) - seed.position.dot(seed.position);
            polygon = clipPolygon(polygon, a, b, c);
        });

        if (polygon.length >= 3) {
            for (const vertex of polygon)
                maximumGrowthRadius = Math.max(maximumGrowthRadius, Math.hypot(vertex.x - seed.position.x, vertex.y - seed.position.y));

            voronoiCells.push({ vertices: polygon, seed, seedIndex, hue: seedIndex / seeds.length });
        }
    });
}

const simulation = Simulation
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
    });

const cells = new BindableCollection();
const cellViews = ViewsCollection.of(PolygonPrimitive).with({
    borderColor: Colour.White,
    borderWidth: 0.02
});
const cellCoresView = ViewsCollection.of(Circle).with({
    fillColor: new Colour(0x444444)
});
const cellModels = [];
const cellCoreModels = [];
const cellBindings = [];
const cellCoreBindings = [];
let cellsAreBound = false;

function reset() {
    seeds = randomSeeds(seedCount);
    buildVoronoiCells();
}

const cellCores = new BindableCollection();
function createCellViews() {
    voronoiCells.forEach((cell, index) => {
        let model = cellModels[index];
        if (!model) {
            model = new VoronoiCellModel({
                vertices: cell.vertices,
                seedIndex: cell.seedIndex,
                hue: cell.hue
            });
            cellModels[index] = model;
            cells.add(model);

            // Keep a stable core model per index so resets update the existing view.
            let coreModel = cellCoreModels[index];
            if (!coreModel) {
                coreModel = cell.seed;
                cellCoreModels[index] = coreModel;
                cellCores.add(coreModel);
                if (cellsAreBound) {
                    const binding = coreModel.alwaysWith(cellCoresView.createView());
                    cellCoreBindings[index] = binding;
                    simulation.bind(binding);
                }
            } else {
                coreModel.position.x = cell.seed.position.x;
                coreModel.position.y = cell.seed.position.y;
                coreModel.radius = cell.seed.radius;
            }

            // Models added after initial setup need their own binding.
            if (cellsAreBound) {
                const binding = model.onceWith(cellViews.createView());
                cellBindings[index] = binding;
                simulation.bind(binding);
            }
        } else {
            model.vertices = cell.vertices;
            model.seedIndex = cell.seedIndex;
            model.hue = cell.hue;
            const coreModel = cellCoreModels[index];
            if (coreModel) {
                coreModel.position.x = cell.seed.position.x;
                coreModel.position.y = cell.seed.position.y;
                coreModel.radius = cell.seed.radius;
            }
        }
    });

    // Keep any leftover views hidden when the seed count is reduced.
    if (cellsAreBound) {
        cellBindings.forEach((binding, index) => {
            if (binding) binding.view.visible = index < voronoiCells.length;
        });
        cellCoreBindings.forEach((binding, index) => {
            if (binding) binding.view.visible = index < voronoiCells.length;
        });
    }

    // onceWith bindings need an explicit synchronization after model geometry changes.
    cellBindings.forEach(binding => binding?.forceSynchronize());
    updateCellColors();
}

let colorMapper = ColorMappers.get(ColorMappers.Gradient);
function updateCellColors() {
    cellBindings.forEach(binding => {
        if (!binding) return;
        const model = binding.model;
        // Color based on distance from seed or just use hue
        const color = new Colour();
        colorMapper.map(model.hue, color);
        binding.view.fillColor = color;
    });
}

reset();
createCellViews();

simulation
    .bind(cells.onceWith(cellViews))
    .bind(cellCores.onceWith(cellCoresView))
    // .onStep(step => {
    //     if (isGrowing)
    //         return;
    //
    //     isGrowing = true;
    //     createCellViews();
    //     isGrowing = false;
    // })
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
        .withValue(ColorMappers.Gradient)
        .onChange(value => {
            colorMapper = ColorMappers.get(value);
            updateCellColors();
        }))
    .append(new Button().withText("Reset").onClick(() => {
        reset();
        createCellViews();
        updateCellColors();
    }))
    .start();

cellsAreBound = true;
// Record the initial bindings so later resets and slider changes can update every view.
cells.forEach((binding, index) => { cellBindings[index] = binding; });
cellCores.forEach((binding, index) => { cellCoreBindings[index] = binding; });
updateCellColors();
