import {
    Button, HueColorMapper, LineSegment, LineSegmentsView, Range, Segments, Simulation, Slider, Vec3
} from '../../../src/index.js';

const DEFAULT_SEED_COUNT = 18;
const DOMAIN_WIDTH = 18;
const DOMAIN_HEIGHT = 18;
const GROWTH_SPEED = 4.5;
const EDGE_EPSILON = 1e-5;

const segments = new Segments();
const view = new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HueColorMapper()
});

let seedCount = DEFAULT_SEED_COUNT;
let growthSpeed = GROWTH_SPEED;
let growthRadius = 0;
let seeds = [];
let voronoiEdges = [];
let maximumGrowthRadius = 0;
let isGrowing = true;

function randomSeeds(count) {
    return Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * DOMAIN_WIDTH * 0.92,
        y: (Math.random() - 0.5) * DOMAIN_HEIGHT * 0.92
    }));
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
            result.push({
                x: current.x + t * (next.x - current.x),
                y: current.y + t * (next.y - current.y)
            });
        }
    }
    return result;
}

function edgeKey(a, b) {
    const pointKey = p => `${p.x.toFixed(5)},${p.y.toFixed(5)}`;
    return [pointKey(a), pointKey(b)].sort().join('|');
}

function isOuterBoundary(a, b) {
    return (
        (Math.abs(a.x + DOMAIN_WIDTH / 2) < EDGE_EPSILON && Math.abs(b.x + DOMAIN_WIDTH / 2) < EDGE_EPSILON) ||
        (Math.abs(a.x - DOMAIN_WIDTH / 2) < EDGE_EPSILON && Math.abs(b.x - DOMAIN_WIDTH / 2) < EDGE_EPSILON) ||
        (Math.abs(a.y + DOMAIN_HEIGHT / 2) < EDGE_EPSILON && Math.abs(b.y + DOMAIN_HEIGHT / 2) < EDGE_EPSILON) ||
        (Math.abs(a.y - DOMAIN_HEIGHT / 2) < EDGE_EPSILON && Math.abs(b.y - DOMAIN_HEIGHT / 2) < EDGE_EPSILON)
    );
}

function buildVoronoiEdges() {
    const edgeMap = new Map();
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

        for (const vertex of polygon)
            maximumGrowthRadius = Math.max(maximumGrowthRadius, Math.hypot(vertex.x - seed.x, vertex.y - seed.y));

        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            if (isOuterBoundary(a, b))
                continue;

            const key = edgeKey(a, b);
            if (!edgeMap.has(key))
                edgeMap.set(key, { a, b, seed, hue: seedIndex / seeds.length });
        }
    });

    voronoiEdges = [...edgeMap.values()];
}

function visibleEdge(edge, radius) {
    const { a, b, seed } = edge;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 1e-12)
        return null;

    // Find the part of this bisector edge whose distance from its seed
    // is no greater than the current radial growth front.
    const projection = ((seed.x - a.x) * dx + (seed.y - a.y) * dy) / lengthSquared;
    const closestX = a.x + projection * dx;
    const closestY = a.y + projection * dy;
    const closestDistanceSquared = (closestX - seed.x) ** 2 + (closestY - seed.y) ** 2;
    const radiusSquared = radius * radius;
    if (closestDistanceSquared > radiusSquared)
        return null;

    const halfSpan = Math.sqrt(Math.max(0, (radiusSquared - closestDistanceSquared) / lengthSquared));
    const t0 = Math.max(0, projection - halfSpan);
    const t1 = Math.min(1, projection + halfSpan);
    if (t1 <= t0)
        return null;

    return {
        start: { x: a.x + t0 * dx, y: a.y + t0 * dy },
        end: { x: a.x + t1 * dx, y: a.y + t1 * dy }
    };
}

function redraw() {
    segments.clear();

    // Fixed cross marks show the seed locations.
    const markerSize = 0.09;
    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        const hue = i / seeds.length;
        segments.push(new LineSegment(
            new Vec3(seed.x - markerSize, seed.y, 0.02),
            new Vec3(seed.x + markerSize, seed.y, 0.02),
            hue
        ));
        segments.push(new LineSegment(
            new Vec3(seed.x, seed.y - markerSize, 0.02),
            new Vec3(seed.x, seed.y + markerSize, 0.02),
            hue
        ));
    }

    for (const edge of voronoiEdges) {
        const part = visibleEdge(edge, growthRadius);
        if (!part)
            continue;
        segments.push(new LineSegment(
            new Vec3(part.start.x, part.start.y, 0),
            new Vec3(part.end.x, part.end.y, 0),
            edge.hue
        ));
    }
}

function reset() {
    seeds = randomSeeds(seedCount);
    growthRadius = 0;
    isGrowing = true;
    buildVoronoiEdges();
    redraw();
}

const seedSlider = new Slider('🌱 Number of seeds')
    .withRange(new Range(4, 40, 1))
    .withValue(seedCount)
    .onChange(value => {
        seedCount = Math.round(value);
        reset();
simulation.start();
    });

const speedSlider = new Slider('⏩ Growth speed')
    .withRange(new Range(0.5, 10, 0.5))
    .withValue(growthSpeed)
    .onInput(value => growthSpeed = value);

const simulation = Simulation
    .with({
        htmlDivId: 'voronoiTessellationContainer',
        viewport: { aspectRatio: '1/1', parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, 30),
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌱 Voronoi tessellation</strong><br/>' +
                'Random seeds grow radially. Wherever two growth fronts meet, a Voronoi edge appears. ' +
                'Each cell contains the points closest to its seed.'
        }
    })
    .bind(segments.alwaysWith(view))
    .runsEvery(0.016)
    .onStep((_clock, dt) => {
        if (!isGrowing)
            return;
        growthRadius = Math.min(maximumGrowthRadius, growthRadius + growthSpeed * dt);
        redraw();
        if (growthRadius >= maximumGrowthRadius)
            isGrowing = false;
    })
    .append(seedSlider)
    .append(speedSlider)
    .append(new Button('↻ Restart growth')
        .withText('Restart growth')
        .onClick(() => {
            reset();
            simulation.start();
        }))
    .withMouseClickEventListener(() => {
        // A custom click handler replaces Simulation's default start/pause handler.
        // Explicitly start/stop the simulation as well as the radial growth.
        if (growthRadius >= maximumGrowthRadius) {
            reset();
            simulation.start();
        } else if (simulation.isRunning) {
            isGrowing = false;
            simulation.stop();
        } else {
            isGrowing = true;
            simulation.start();
        }
    });

reset();
