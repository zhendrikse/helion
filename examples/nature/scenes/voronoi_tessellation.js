import {
    Range, Bindable, Simulation, Slider, DropdownMenu,
    BindableCollection, ViewsCollection, Colour, ColorMappers, PolygonPrimitive, Vec2
} from '../../../src/index.js';

const MIN_SEED_COUNT = 4;
const MAX_SEED_COUNT = 250;
const DEFAULT_SEED_COUNT = 100;
const DOMAIN_WIDTH = 18;
const DOMAIN_HEIGHT = 18;
const DEFAULT_GROWTH_SPEED = 4.5;
const EDGE_EPSILON = 1e-5;
const GROWTH_FRAME_LIMIT = 0.1;
const KERNEL_RADIUS = 0.09;
const CIRCLE_SEGMENTS = 20;
const INACTIVE_VERTICES = [
    new Vec2(-0.001, -0.001),
    new Vec2(0.001, -0.001),
    new Vec2(0, 0.001)
];

let seedCount = DEFAULT_SEED_COUNT;
let growthSpeed = DEFAULT_GROWTH_SPEED;
let seeds = [];
let voronoiCells = [];
let growthRadius = 0;
let previousFrameTime = null;
let colorMapper = ColorMappers.get(ColorMappers.Gradient);

class VoronoiCellModel extends Bindable {
    constructor(seedIndex) {
        super();
        this.seedIndex = seedIndex;
        this.hue = seedIndex / MAX_SEED_COUNT;
        this.vertices = [...INACTIVE_VERTICES];
        this.active = false;
    }
}

class SeedKernelModel extends Bindable {
    constructor(seedIndex) {
        super();
        this.seedIndex = seedIndex;
        this.vertices = [...INACTIVE_VERTICES];
        this.active = false;
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
    if (polygon.length === 0)
        return result;

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
            const denominator = currentValue - nextValue;
            if (Math.abs(denominator) > 1e-14) {
                const t = currentValue / denominator;
                result.push(new Vec2(
                    current.x + t * (next.x - current.x),
                    current.y + t * (next.y - current.y)
                ));
            }
        }
    }
    return result;
}

function buildVoronoiCells() {
    // Always rebuild from scratch; otherwise changing the seed count leaves stale cells behind.
    voronoiCells = seeds.map((seed, seedIndex) => {
        let vertices = [
            new Vec2(-DOMAIN_WIDTH / 2, -DOMAIN_HEIGHT / 2),
            new Vec2(DOMAIN_WIDTH / 2, -DOMAIN_HEIGHT / 2),
            new Vec2(DOMAIN_WIDTH / 2, DOMAIN_HEIGHT / 2),
            new Vec2(-DOMAIN_WIDTH / 2, DOMAIN_HEIGHT / 2)
        ];

        for (let otherIndex = 0; otherIndex < seeds.length && vertices.length > 0; otherIndex++) {
            if (otherIndex === seedIndex)
                continue;

            const other = seeds[otherIndex];
            const a = 2 * (other.x - seed.x);
            const b = 2 * (other.y - seed.y);
            const c = other.x * other.x + other.y * other.y - seed.x * seed.x - seed.y * seed.y;
            vertices = clipPolygon(vertices, a, b, c);
        }

        const maxRadius = vertices.reduce(
            (radius, vertex) => Math.max(radius, Math.hypot(vertex.x - seed.x, vertex.y - seed.y)),
            0
        );

        return {
            seed,
            seedIndex,
            hue: seedIndex / Math.max(1, seeds.length),
            vertices,
            maxRadius
        };
    });
}

function makeKernelVertices(seed) {
    return Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => {
        const angle = 2 * Math.PI * index / CIRCLE_SEGMENTS;
        return new Vec2(
            seed.x + KERNEL_RADIUS * Math.cos(angle),
            seed.y + KERNEL_RADIUS * Math.sin(angle)
        );
    });
}

function updateCellColors() {
    cells.forEach(binding => {
        if (!binding.model.active)
            return;
        const color = new Colour();
        colorMapper.map(binding.model.hue, color);
        binding.view.fillColor = color;
    });
}

function updateGrowth() {
    for (let i = 0; i < MAX_SEED_COUNT; i++) {
        const cellModel = cellModels[i];
        const kernelModel = kernelModels[i];
        const cell = voronoiCells[i];

        if (!cell) {
            cellModel.active = false;
            cellModel.vertices = [...INACTIVE_VERTICES];
            kernelModel.active = false;
            kernelModel.vertices = [...INACTIVE_VERTICES];
            const cellBinding = cellsBinding(i);
            const kernelBinding = kernelsBinding(i);
            if (cellBinding) cellBinding.view.visible = false;
            if (kernelBinding) kernelBinding.view.visible = false;
            continue;
        }

        cellModel.active = true;
        kernelModel.active = true;
        const fraction = cell.maxRadius > 0
            ? Math.min(1, growthRadius / cell.maxRadius)
            : 1;

        // Expand every cell radially from its seed, preserving its final Voronoi boundary.
        cellModel.vertices = cell.vertices.map(vertex => new Vec2(
            cell.seed.x + (vertex.x - cell.seed.x) * fraction,
            cell.seed.y + (vertex.y - cell.seed.y) * fraction
        ));
        kernelModel.vertices = makeKernelVertices(cell.seed);

        const cellBinding = cellsBinding(i);
        const kernelBinding = kernelsBinding(i);
        if (cellBinding) cellBinding.view.visible = fraction > 0.002;
        if (kernelBinding) kernelBinding.view.visible = true;
    }
    updateCellColors();
}

function cellsBinding(index) {
    return cells._bindings[index];
}

function kernelsBinding(index) {
    return kernels._bindings[index];
}

function reset() {
    seeds = randomSeeds(seedCount);
    growthRadius = 0;
    previousFrameTime = null;
    buildVoronoiCells();
    updateGrowth();
}

const cells = new BindableCollection();
const kernels = new BindableCollection();
const cellModels = Array.from({ length: MAX_SEED_COUNT }, (_, index) => new VoronoiCellModel(index));
const kernelModels = Array.from({ length: MAX_SEED_COUNT }, (_, index) => new SeedKernelModel(index));

cellModels.forEach(model => cells.add(model));
kernelModels.forEach(model => kernels.add(model));

const cellViews = ViewsCollection.of(PolygonPrimitive).with({
    borderColor: Colour.White,
    borderWidth: 0.02
});
const kernelViews = ViewsCollection.of(PolygonPrimitive).with({
    fillColor: Colour.White,
    borderColor: Colour.Black,
    borderWidth: 0.035
});

const simulation = Simulation.with({
    htmlDivId: 'voronoiTessellationContainer',
    viewport: { parameterMenuCollapsed: false },
    camera: { orthographic: true, controls: false },
    lighting: { enabled: false },
    infoPanel: {
        text: '<strong>🧫 Voronoi tessellation</strong><br/>' +
            'Cells expand radially from visible seed nuclei. The final boundaries are a Voronoi tessellation.'
    }
});

simulation
    .bind(cells.alwaysWith(cellViews))
    .bind(kernels.alwaysWith(kernelViews))
    .onFrame(timeStamp => {
        if (previousFrameTime !== null) {
            const deltaSeconds = Math.min((timeStamp - previousFrameTime) / 1000, GROWTH_FRAME_LIMIT);
            if (growthRadius < Math.max(DOMAIN_WIDTH, DOMAIN_HEIGHT)) {
                growthRadius += Math.max(0, deltaSeconds) * growthSpeed;
                updateGrowth();
            }
        }
        previousFrameTime = timeStamp;
    })
    .onReset(reset)
    .frameSceneOn(cellViews, { padding: 1.0 })
    .append(new Slider('🧫 Number of seeds')
        .withRange(new Range(MIN_SEED_COUNT, MAX_SEED_COUNT, 0.95))
        .withValue(seedCount)
        .onChange(value => {
            seedCount = Math.max(MIN_SEED_COUNT, Math.min(MAX_SEED_COUNT, Math.round(value)));
            reset();
        }))
    .append(new Slider('🏃 Growth speed')
        .withRange(new Range(0.5, 10, 0.5))
        .withValue(growthSpeed)
        .onInput(value => {
            growthSpeed = value;
        }))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Gradient)
        .onChange(value => {
            colorMapper = ColorMappers.get(value);
            updateCellColors();
        }))
    .start();

reset();
