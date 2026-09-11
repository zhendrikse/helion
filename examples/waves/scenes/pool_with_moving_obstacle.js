import {
    DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface, Transformation,
    SurfaceResolution, WaveEquationSolver, LaplaceOperator, Box, Block, GlyphLayer,
    SurfaceVisualization, FixedIntervalNormalizer, RadioGroup, Checkbox, Slider, Range, ColorMappers,
} from "../../../src/index.js";

export class PoolWaveEquation {
    constructor({ velocity = 5, damping = 0.02 } = {}) {
        this._velocity = velocity;
        this._damping = damping;
    }
    get damping() { return this._damping; }
    acceleration(field, i, j) {
        return this._velocity * this._velocity * LaplaceOperator.at(field, i, j);
    }
}

export class MovingObstacle extends Block {
    constructor({ poolSize = 200, speed = 5, start = -90 } = {}) {
        const width = poolSize / 6;
        const yStart = -poolSize / 8;
        const yEnd = poolSize / 8;
        const blockHeight = Math.max(8, poolSize * 0.1);
        const initialPosition = new Vec3(start + width / 2, blockHeight / 2 - 1, (yStart + yEnd) / 2);
        const size = new Vec3(width, blockHeight, yEnd - yStart);
        super({ position: initialPosition, size, orientation: new Vec3(0, 0, 0) });
        this._poolSize = poolSize;
        this._width = width;
        this._yStart = yStart;
        this._yEnd = yEnd;
        this._initialStart = start;
        this._start = start;
        this._speed = speed;
        this._reachedEnd = false;
        this._blockHeight = blockHeight;
        this._initialPosition = initialPosition.clone();
    }
    get speed() { return this._speed; }
    set speed(v) { this._speed = v; }
    boundaries() {
        return { start: this._start, width: this._width, yStart: this._yStart, yEnd: this._yEnd };
    }
    isMoving() { return !this._reachedEnd && Math.abs(this._speed) > 1e-9; }
    /** @param {number} dt scaled simulation time */
    move(dt) {
        if (this._reachedEnd) return;
        this._start += this._speed * dt;
        this.position.x = this._start + this._width / 2;
        if (this._start + this._width >= this._poolSize / 2 - 2) this._reachedEnd = true;
    }
    reset() {
        this._start = this._initialStart;
        this._reachedEnd = false;
        this.position.copy(this._initialPosition);
        // Body reset zou _initialState herstellen, maar _start is leidend voor boundaries
        super.reset();
        this.position.copy(this._initialPosition);
    }
}

class ObstacleMask extends Transformation {
    constructor(obstacle) { super(); this._obstacle = obstacle; }
    /** @param {DiscreteScalarField} field */
    applyTo(field) {
        const b = this._obstacle.boundaries();
        const offX = field.nx / 2, offY = field.ny / 2;
        for (let i = 1; i < field.nx - 1; i++) {
            const x = i - offX;
            if (x < b.start || x > b.start + b.width) 
                continue;
            for (let j = 1; j < field.ny - 1; j++) {
                const y = j - offY;
                if (y >= b.yStart && y <= b.yEnd) 
                    field.setValueAt(i, j, 0);
            }
        }
    }
}

class BowWake extends Transformation {
    constructor(obstacle, sigmaFactor = 0.04) { 
        super(); 
        this._obstacle = obstacle; 
        this._sigmaFactor = sigmaFactor; 
    }
    /** @param {DiscreteScalarField} field */
    applyTo(field) {
        if (!this._obstacle.isMoving()) return;
        const b = this._obstacle.boundaries();
        const front = b.start + b.width;
        const offX = field.nx / 2, offY = field.ny / 2;
        const sigma = this._obstacle._poolSize * this._sigmaFactor;
        const amplitude = 8e-5  * this._obstacle.speed + 5e-4;
        const dx = field.nx / NX;
        for (let i = 1; i < field.nx - 1; i++) {
            const x = i - offX;
            if (Math.abs(x - front) > 5 * dx) continue;
            for (let j = 1; j < field.ny - 1; j++) {
                const y = j - offY;
                if (y < b.yStart || y > b.yEnd) continue;
                const dist = x - front;
                const wave = Math.exp(-0.05 * (dist / sigma) * (dist / sigma));
                field.setValueAt(i, j, field.valueAt(i, j) + amplitude * wave);
            }
        }
    }
}

function createPoolWalls(poolSize = 200, wallThickness = 2, depth = 8) {
    const half = poolSize / 2;
    const wallColor = 0xccaa00;
    const walls = [];

    walls.push({ 
        model: new Block({
            position: new Vec3(0, -depth, 0),
            size: new Vec3(poolSize, wallThickness, poolSize),
            fixed: true
        }),
        view: new Box({ color: wallColor })
    }); // Bottom
    walls.push({
        model: new Block({
            position: new Vec3(0, -2, -half),
            size: new Vec3(poolSize, 10, wallThickness),
            fixed: true
        }),
        view: new Box({ color: wallColor })
    }); // Back wall
    walls.push({
        model: new Block({
            position: new Vec3(-half, -2, 0),
            size: new Vec3(wallThickness, 10, poolSize),
            fixed: true
        }),
        view: new Box({ color: wallColor })
    }); // Left wall
    walls.push({
        model: new Block({
            position: new Vec3(half, -2, 0),
            size: new Vec3(wallThickness, 10, poolSize),
            fixed: true
        }),
        view: new Box({ color: wallColor })
    }); // Right wall
    return walls;
}

const RESOLUTION = 200;
const NX = 200, NY = 200, POOL_SIZE = NX;

const field = new DiscreteScalarField({ nx: NX, ny: NY });
const waveEquation = new PoolWaveEquation({ velocity: 5, damping: 0.02 });
const solver = new WaveEquationSolver(waveEquation);
const surface = new DiscreteFieldSurface(field);
const poolWalls = createPoolWalls(POOL_SIZE, 2, 8);

const waterSurface = new SurfaceVisualization({
    resolution: new SurfaceResolution(RESOLUTION, RESOLUTION),
    colorMapper: new ColorMappers().get(ColorMappers.WaterAlternative)(),
    normalizer: new FixedIntervalNormalizer(new Interval(-0.3, 2)),
    opacity: 0.85,
    display: SurfaceVisualization.Display.Glyphs,
    glyphType: GlyphLayer.GlyphTypes.BOXES
});
waterSurface.position.set(-NX * 0.5, 0, -NY * 0.5);

const obstacle = new MovingObstacle({ 
    poolSize: POOL_SIZE, 
    speed: 5, 
    start: -POOL_SIZE / 2 + 10 
});
const obstacleView = new Box({ color: 0x00ff00, opacity: 0.9 });
const mask = new ObstacleMask(obstacle);
const wake = new BowWake(obstacle);

let simulation = Simulation
    .with({
        htmlDivId: "poolWithMovingObstacleContainer",
        camera: { 
            position: new Vec3(0.45, 0.7, 1.0).multiplyScalar(POOL_SIZE * 1.4), 
            target: new Vec3(-0, 0, 0),
            fieldOfView: 30 },
        viewport: { aspectRatio: "19/12" }
    })
    .bind(surface.alwaysWith(waterSurface))
    .bind(obstacle.alwaysWith(obstacleView))
    .bind(new Block({
            position: new Vec3(0, -4, 0),
            size: new Vec3(POOL_SIZE, 4, POOL_SIZE),
            fixed: true
        }).onceWith(new Box({color: 0x0a3bbd, opacity: 0.8})))
    .withMouseClickEventListener()
    .onReset(() => {
        field.reset();
        solver.reset();
        obstacle.reset();
    })
    .runsEvery(0.0025)
    .advancesBy(0.02)
    .onStep((_, dt) => {
        if (obstacle.isMoving()) 
            obstacle.move(dt);
        field.evolve(solver, dt);
        field.apply(wake);
        field.apply(mask);
    })
    .append(waterSurface.ui())
    .append(
        new RadioGroup()
            .add("Smooth", () => waterSurface.display(SurfaceVisualization.Display.Surface))
            .add("Glyphs", () => waterSurface.display(SurfaceVisualization.Display.Glyphs))
            .checked(0)
    )
    .append(waterSurface.glyphLayer.ui())
    .append(new Checkbox("Wireframe ").on(waterSurface.surfaceLayer).withProperty("wireframe"))
    .append(new Slider("Obstacle speed")
        .withRange(new Range(0, 10, 0.1))
        .withValue(5).onInput(e => obstacle.speed = Number(e.target.value))
    );

for (const { model, view } of poolWalls) simulation.bind(model.onceWith(view));
