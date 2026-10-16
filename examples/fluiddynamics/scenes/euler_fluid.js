import { Color, LinearSRGBColorSpace } from 'three';
import {
    Checkbox, ColorMappers, DiscreteScalarField, DiscreteVectorField, Circle, VelocitiesView, Slider, Vec2,
    DropdownMenu, Interval, RadialSymmetricBody, RadioGroup, Simulation, Solver, Colour, Range, StreamlinesView,
    DiscreteFieldSurfaceView, FixedIntervalNormalizer, Bindable
} from '../../../src/index.js';

const SOLID = 0.0;
const FLUID = 1.0;

const SCENE_TYPE = Object.freeze({
    TANK: 0,
    WIND_TUNNEL: 1,
    PAINT: 2,
    HIRES_TUNNEL: 3
});

class FluidSolver extends Solver {
    constructor({
        numIterations = 100,
        overRelaxation = 1.9
    } = {}) {
        super();
        this.numIterations = numIterations;
        this.overRelaxation = overRelaxation;
        this._newVelocityX = new DiscreteScalarField({ nx: 0, ny: 0 });
        this._newVelocityY = new DiscreteScalarField({ nx: 0, ny: 0 });
        this._newSmokeField = new DiscreteScalarField({ nx: 0, ny: 0 });
        this._vector1 = new Vec2();
        this._vector2 = new Vec2();
        this._vector3 = new Vec2();
    }

    _advectVelocityAt(fluid, i, j, dt) {
        if (fluid.obstacleMaskAt(j, i) !== SOLID &&
            fluid.obstacleMaskAt(j, i - 1) !== SOLID &&
            j < fluid.ny - 1)
            this._newVelocityX.setValueAt(j, i, fluid.calculateVelocityX(i, j, dt));

        if (fluid.obstacleMaskAt(j, i) !== SOLID &&
            fluid.obstacleMaskAt(j - 1, i) !== SOLID &&
            i < fluid.nx - 1)
            this._newVelocityY.setValueAt(j, i, fluid.calculateVelocityY(i, j, dt));
    }

    _advectVelocity(/** @type {EulerFluid} */ fluid, /** @type {number} */ dt) {
        for (let i = 1; i < fluid.nx; i++)
            for (let j = 1; j < fluid.ny; j++)
                this._advectVelocityAt(fluid, i, j, dt);
    }

    _advectSmokeAt(fluid, i, j, dt) {
        if (fluid.obstacleMaskAt(j, i) === SOLID)
            return;

        const delta = fluid.gridSpacing;
        fluid.valueAt(j, i, this._vector1);
        fluid.valueAt(j, i + 1, this._vector2);
        fluid.valueAt(j + 1, i, this._vector3);
        const u = (this._vector1.x + this._vector2.x) * 0.5;
        const v = (this._vector1.y + this._vector3.y) * 0.5;
        const x = (i + .5) * delta - dt * u;
        const y = (j + .5) * delta - dt * v;

        this._newSmokeField.setValueAt(j, i, fluid.sampleSmoke(x, y));
    }

    _advectSmoke(/** @type {EulerFluid} */ fluid, /** @type {number} */ dt) {
        this._newSmokeField.data.set(fluid._smokeField.data);
        for (let i = 1; i < fluid.nx - 1; i++)
            for (let j = 1; j < fluid.ny - 1; j++)
                this._advectSmokeAt(fluid, i, j, dt);

        fluid._smokeField.data.set(this._newSmokeField.data);
    }

    /**
     * @param {EulerFluid} fluid
     * @param {number} dt
     */
    step(fluid, dt) {
        fluid._pressureField.reset();
        fluid.solveIncompressibility(this.numIterations, this.overRelaxation, dt);
        fluid.extrapolate();

        this._newVelocityX.data.set(fluid._vectorComponentX.data);
        this._newVelocityY.data.set(fluid._vectorComponentY.data);
        this._advectVelocity(fluid, dt);
        fluid._vectorComponentX.data.set(this._newVelocityX.data);
        fluid._vectorComponentY.data.set(this._newVelocityY.data);

        this._advectSmoke(fluid, dt);
    }

    init(/** @type {EulerFluid} */ fluid) {
        this._newVelocityX = new DiscreteScalarField({ nx: fluid.nx, ny: fluid.ny });
        this._newVelocityY = new DiscreteScalarField({ nx: fluid.nx, ny: fluid.ny });
        this._newSmokeField = new DiscreteScalarField({ nx: fluid.nx, ny: fluid.ny });
    }
}

/**
 * The discrete vector field represents the (two-dimensional) velocity vectors.
 */
class EulerFluid extends DiscreteVectorField {
    /**
     * @param {{
     *     density?: number,
     *     resolution?: number
     * }} options
     */
    constructor({
        density = 1000,
        resolution = 100
    } = {}) {
        super({ nx: 0, ny: 0 });
        this.density = 0;
        this._pressureField = new DiscreteScalarField({ nx: 0, ny: 0 });
        this._obstacleMask = new DiscreteScalarField({ nx: 0, ny: 0 });
        this._smokeField = new DiscreteScalarField({ nx: 0, ny: 0 });
        this.init({ density, resolution });
    }

    /**
     * @param {{
     *    density?: number,
     *    resolution?: number
     * }} options
     */
    init({
         density = 1000,
         resolution = 100
     } = {}) {
        this.resize(resolution + 2, resolution + 2);
        this.density = density;
        this._gridSpacing = 1 / resolution;
        this._pressureField = new DiscreteScalarField({ nx: this.nx, ny: this.ny });
        this._obstacleMask = new DiscreteScalarField({ nx: this.nx, ny: this.ny });
        this._smokeField = new DiscreteScalarField({ nx: this.nx, ny: this.ny });
        this._smokeField.data.fill(1.0)
    }

    integrate(/** @type {number} */ gravity, /** @type {number} */ dt) {
        if (gravity === 0.0)
            return;

        for (let i = 1; i < this.nx; i++)
            for (let j = 1; j < this.ny - 1; j++)
                if (this._obstacleMask.valueAt(j, i) !== SOLID && this._obstacleMask.valueAt(j - 1, i) !== SOLID)
                    this._vectorComponentY.setValueAt(j, i, this._vectorComponentY.valueAt(j, i) + gravity * dt);
    }

    _solveIncompressibility(i, j, cp, overRelaxation) {
        if (this._obstacleMask.valueAt(j, i) === SOLID)
            return;

        const sx0 = this._obstacleMask.valueAt(j, i - 1);
        const sx1 = this._obstacleMask.valueAt(j, i + 1);
        const sy0 = this._obstacleMask.valueAt(j - 1, i);
        const sy1 = this._obstacleMask.valueAt(j + 1, i);
        const s = sx0 + sx1 + sy0 + sy1;
        if (s === 0.0)
            return;

        const div =
            this._vectorComponentX.valueAt(j, i + 1) -
            this._vectorComponentX.valueAt(j, i) +
            this._vectorComponentY.valueAt(j + 1, i) -
            this._vectorComponentY.valueAt(j, i);

        let p = -div / s;
        p *= overRelaxation;
        this._pressureField.setValueAt(j, i, this._pressureField.valueAt(j, i) + cp * p);

        this._vectorComponentX.setValueAt(j, i, this._vectorComponentX.valueAt(j, i) - sx0 * p);
        this._vectorComponentX.setValueAt(j, i + 1, this._vectorComponentX.valueAt(j, i + 1) + sx1 * p);
        this._vectorComponentY.setValueAt(j, i, this._vectorComponentY.valueAt(j, i) - sy0 * p);
        this._vectorComponentY.setValueAt(j + 1, i, this._vectorComponentY.valueAt(j + 1, i) + sy1 * p);
    }

    solveIncompressibility(/** @type {number} */ numIters, /** @type {number} */ overRelaxation, /** @type {number} */ dt) {
        const cp = this.density * this._gridSpacing / dt;
        for (let iter = 0; iter < numIters; iter++)
            for (let i = 1; i < this.nx - 1; i++)
                for (let j = 1; j < this.ny - 1; j++)
                    this._solveIncompressibility(i, j, cp, overRelaxation);
    }

    extrapolate() {
        for (let i = 0; i < this.nx; i++) {
            this._vectorComponentX.setValueAt(0, i, this._vectorComponentX.valueAt(1, i));
            this._vectorComponentX.setValueAt(this.ny - 1, i, this._vectorComponentX.valueAt(this.ny - 2, i));
        }
        for (let j = 0; j < this.ny; j++) {
            this._vectorComponentY.setValueAt(j, 0, this._vectorComponentY.valueAt(j, 1));
            this._vectorComponentY.setValueAt(j, this.nx - 1, this._vectorComponentY.valueAt(j, this.nx - 2));
        }
    }

    get pressureRange() { return this._pressureField.rangeAt(); }

    sample(positionVector, velocity) {
        // StreamlinesView uses centered world coordinates; the solver's raster
        // sampling remains in coordinates measured from the lower-left grid edge.
        const x = positionVector.x + (0.5 * this.nx + 0.5) * this._gridSpacing;
        const y = positionVector.y + (0.5 * this.ny + 0.5) * this._gridSpacing;
        velocity.set(
            this._sampleField(x, y, 0, .5 * this._gridSpacing, this._vectorComponentX),
            this._sampleField(x, y, 0.5 * this._gridSpacing, 0, this._vectorComponentY)
        );
        return velocity;
    }

    sampleSmoke(/** @type {number} */ x, /** @type {number} */ y) {
        return this._sampleField(x, y,.5 * this._gridSpacing, .5 * this._gridSpacing, this._smokeField);
    }
    pressureAt(/** @type {number} */ i, /** @type {number} */ j) { return this._pressureField.valueAt(i, j); }
    smokeAt(/** @type {number} */ i, /** @type {number} */ j) { return this._smokeField.valueAt(i, j); }
    obstacleMaskAt(/** @type {number} */ i, /** @type {number} */ j) { return this._obstacleMask.valueAt(i, j); }

    _sampleField(x, y, dx, dy, field) {
        const h = this._gridSpacing;
        x = Math.max(Math.min(x, this.nx * h), h) - dx;
        y = Math.max(Math.min(y, this.ny * h), h) - dy;

        const x0 = Math.min(Math.floor(x / this._gridSpacing), this.nx - 1);
        const tx = (x - x0 * h) / this._gridSpacing;
        const x1 = Math.min(x0 + 1, this.nx - 1);

        const y0 = Math.min(Math.floor(y / this._gridSpacing), this.ny - 1);
        const ty = (y - y0 * h) / this._gridSpacing;
        const y1 = Math.min(y0 + 1, this.ny - 1);

        const sx = 1.0 - tx;
        const sy = 1.0 - ty;

        return sx * sy * field.valueAt(y0, x0) +
            tx * sy * field.valueAt(y0, x1) +
            tx * ty * field.valueAt(y1, x1) +
            sx * ty * field.valueAt(y1, x0);
    }

    _averageVelocityX(/** @type {number} */ i, /** @type {number} */ j) {
        return (
            this._vectorComponentX.valueAt(j - 1, i) +
            this._vectorComponentX.valueAt(j, i) +
            this._vectorComponentX.valueAt(j - 1, i + 1) +
            this._vectorComponentX.valueAt(j, i + 1)
        ) * 0.25;
    }

    _averageVelocityY(/** @type {number} */ i, /** @type {number} */ j) {
        return (
            this._vectorComponentY.valueAt(j, i - 1) +
            this._vectorComponentY.valueAt(j, i) +
            this._vectorComponentY.valueAt(j + 1, i - 1) +
            this._vectorComponentY.valueAt(j + 1, i)
        ) * 0.25;
    }

    calculateVelocityX(/** @type {number} */ i, /** @type {number} */ j, /** @type {number} */ dt) {
        let x = i * this._gridSpacing;
        let y = (j + .5) * this._gridSpacing;
        x -= dt * this._vectorComponentX.valueAt(j, i);
        y -= dt * this._averageVelocityY(i, j);
        return this._sampleField(x, y, 0, .5 * this._gridSpacing, this._vectorComponentX);
    }

    calculateVelocityY(/** @type {number} */ i, /** @type {number} */ j, /** @type {number} */ dt) {
        let x = (i + .5) * this._gridSpacing;
        let y = j * this._gridSpacing;
        x -= dt * this._averageVelocityX(i, j);
        y -= dt * this._vectorComponentY.valueAt(j, i);
        return this._sampleField(x, y, .5 * this._gridSpacing, 0, this._vectorComponentY);
    }

    setObstacle(/** @type {number} */ x, /** @type {number} */ y, /** @type {boolean} */ reset) {
        const vx = reset ? 0.0 : (x - obstacle.position.x) / dt;
        const vy = reset ? 0.0 : (y - obstacle.position.y) / dt;
        const r2 = obstacle.radius * obstacle.radius;

        obstacle.position.set(x, y);
        for (let i = 1; i < this.nx - 2; i++)
            for (let j = 1; j < this.ny - 2; j++) {
                this._obstacleMask.setValueAt(j, i, FLUID);

                // Cell centers and obstacle positions are both in centered world coordinates.
                const dx = (i + 0.5 - 0.5 * this.nx) * this._gridSpacing - x;
                const dy = (j + 0.5 - 0.5 * this.ny) * this._gridSpacing - y;
                if (dx * dx + dy * dy > r2)
                    continue;

                this._obstacleMask.setValueAt(j, i, SOLID);
                this._smokeField.setValueAt(j, i, 0.5 + 0.5 * Math.sin(0.1 * frameNr));

                this._vectorComponentX.setValueAt(j, i, vx);
                this._vectorComponentX.setValueAt(j, i + 1, vx);
                this._vectorComponentY.setValueAt(j, i, vy);
                this._vectorComponentY.setValueAt(j + 1, i, vy);
            }
    }

    /**
     * @param {Solver} solver
     * @param {number} dt
     */
    evolve(solver, dt) { solver.step(this, dt); }
}

class PressureFieldAdapter extends Bindable {
    constructor(fluid) {
        super();
        this.fluid = fluid;
    }

    get nx() { return this.fluid.nx; }
    get ny() { return this.fluid.ny; }

    rangeAt() { return this.fluid.pressureRange; }
    valueAt(i, j) { return this.fluid.pressureAt(j, i); }
}

class SmokeFieldAdapter extends Bindable {
    constructor(fluid) {
        super();
        this.fluid = fluid;
        this._range = new Interval(0, 1);
    }

    get nx() { return this.fluid.nx; }
    get ny() { return this.fluid.ny; }

    rangeAt() { return this._range; }
    valueAt(i, j) { return this.fluid.smokeAt(j, i); }
}

function setLeftBorderTo(solidOrLiquid) {
    const left = solidOrLiquid === SOLID ? fluid.nx - 1 : 0;
    for (let i = 0; i < fluid.nx; i++)
        for (let j = 0; j < fluid.ny; j++)
            fluid._obstacleMask.setValueAt(j, i, (i === 0 || i === left || j === 0 || j === fluid.ny - 1) ? SOLID : FLUID);
}

function tankScene(/** @type {EulerFluid} */ fluid) {
    setLeftBorderTo(SOLID);
    gravity = -9.81;
    smokeView.visible = false;
}

function setFluidVelocity(/** @type {number} */ speed) {
    fluidSpeed = speed;
    for (let j = 0; j < fluid.ny; j++)
        fluid._vectorComponentX.setValueAt(j, 1, speed);
}

function vortexSheddingScene(/** @type {EulerFluid} */ fluid,  /** @type {number} */ fluidSpeed, /** @type {number} */ sceneNumber) {
    setFluidVelocity(fluidSpeed);
    const pipeH = 0.1 * fluid.ny;
    const minJ = Math.floor(0.5 * fluid.ny - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * fluid.ny + 0.5 * pipeH);
    for (let j = minJ; j < maxJ; j++)
        fluid._smokeField.setValueAt(j, 0, 0.0);

    // Preserve the obstacle's previous location after centering the world.
    fluid.setObstacle(0.4 - 0.5 * fluid.nx * fluid.gridSpacing,
                      0.5 - 0.5 * fluid.ny * fluid.gridSpacing, true);
}

function paintScene() {
    setLeftBorderTo(SOLID);
    solver.overRelaxation = 1.0;
    obstacle.radius = 0.1;
    obstacleView.fillColor = new Colour(0x333333);
}

function configureDiscreteFieldSurfaceView(view, fluid) {
    view.scale.set(1 / fluid.nx, 1 / fluid.ny, 1);
    view.dispose();
    view.initialize(fluid);
}

function setupScene(/** @type {number} */ sceneNr = 0) {
    gravity = 0.0;
    frameNr = 0;
    dt = sceneNr === SCENE_TYPE.HIRES_TUNNEL ? 1.0 / 125.0 : 1 / 60.0;
    solver.numIterations = sceneNr === SCENE_TYPE.HIRES_TUNNEL ? 25 : 40;

    fluid.init({ resolution: sceneNr === SCENE_TYPE.HIRES_TUNNEL ? 200 : 100 });
    configureDiscreteFieldSurfaceView(pressureView, fluid);
    configureDiscreteFieldSurfaceView(smokeView, fluid);
    setLeftBorderTo(FLUID);
    solver.init(fluid);
    solver.numIterations = 40;
    solver.overRelaxation = 1.9;
    obstacle.radius = 0.15;
    obstacleView.radiusOffset = fluid.gridSpacing;
    smokeView.visible = true;
    obstacleView.fillColor = new Colour(0x131313);
    streamlinesView.seedSpacing = sceneNr === SCENE_TYPE.HIRES_TUNNEL ? 10 : 5;
    velocitiesView.stepSize = sceneNr === SCENE_TYPE.HIRES_TUNNEL ? 2 : 1;

    if (sceneNr === SCENE_TYPE.TANK)
        tankScene(fluid);
    else if (sceneNr === SCENE_TYPE.WIND_TUNNEL || sceneNr === SCENE_TYPE.HIRES_TUNNEL)
        vortexSheddingScene(fluid, fluidSpeed, sceneNr);
    else if (sceneNr === SCENE_TYPE.PAINT)
        paintScene();
}

const pressureView = new DiscreteFieldSurfaceView({
    colorMapper: ColorMappers.get(ColorMappers.Scientific, { colorSpace: LinearSRGBColorSpace }),
    opacityFunction: () => 1,
    colorSpace: LinearSRGBColorSpace,
});

const smokePressureColor = new Color().setRGB( 1.2e-2, 1.2e-2, 1.2e-2);
const smokeColor = new Color().setRGB( 1 - 1.2e-2, 1 - 1.2e-2, 1 - 1.2e-2);
const smokeMapper = ColorMappers.get(ColorMappers.Uniform, { color: smokePressureColor });
const smokeView = new DiscreteFieldSurfaceView({
    colorMapper: smokeMapper,
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => Math.sqrt(value),
    colorSpace: LinearSRGBColorSpace
});

let dt = 1.0 / 120;
let paused = false;
let frameNr = 0;
let showPressure = true;
let mouseDown = false;
let gravity = -9.81;
let fluidSpeed = 2.0;
const fluid = new EulerFluid();
const velocitiesView = new VelocitiesView({ visible: false, color: new Colour(0x006666) });
const obstacleView = new Circle({ radiusOffset: fluid.gridSpacing });
const streamlinesView = new StreamlinesView({ visible: false, color: new Colour(0x666600) });

const obstacle = new RadialSymmetricBody({ radius: 0.15 });
const solver = new FluidSolver({ numIterations: 40 });
setupScene(SCENE_TYPE.WIND_TUNNEL);

function simulate() {
    if (paused)
        return;

    frameNr++;
    fluid.integrate(gravity, dt);
    fluid.evolve(solver, dt);

    if (frameNr % 10 === 0)
        simulation.setBottomText( showPressure ?
            `Pressure: [${fluid.pressureRange.min.toFixed(0)}, ${fluid.pressureRange.max.toFixed(0)}] Pa` : '');
}

const simulation = Simulation
    .with({
        htmlDivId: 'eulerFluidContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: { orthographic: true, controls: false },
        headUpDisplay: { enabled: false },
        lighting: { enabled: false },
        infoPanel: {
            text:
                '<strong>🍃 Euler fluid</strong><br/>&nbsp;<br/>' +
                '©️ Fluid dynamics: ' +
                '<a href=\"https://www.matthiasMueller.info/tenMinutePhysics\">Matthias Müller</a></br>' +
                '👉 Use mouse to move obstacle.<br>' +
                '👉 Use \"p\" and \"m\" keys to pause and/or step'
        }
    })
    .runsEvery(3e-2)
    .onStep(() => simulate())
    .bind(new PressureFieldAdapter(fluid).alwaysWith(pressureView))
    .bind(new SmokeFieldAdapter(fluid).alwaysWith(smokeView))
    .bind(fluid.alwaysWith(streamlinesView))
    .bind(fluid.alwaysWith(velocitiesView))
    .bind(obstacle.alwaysWith(obstacleView))
    .frameSceneOn(pressureView, { padding: 1.0 })
    .onMouse('mouseup', () => mouseDown = false)
    .onMouse('mouseleave', () => mouseDown = false)
    .onMouse('mousedown', (x, y, _event) => {
        mouseDown = true;
        fluid.setObstacle(x, y, true);
    })
    .onMouse('mousemove', (x, y, _event) => {
        if (!mouseDown) return;

        fluid.setObstacle(x, y, false);
    })
    .onTouch('touchstart', (x, y, event) => {
        mouseDown = true;
        fluid.setObstacle(x, y, true);
    }, { passive: true })
    .onTouch('touchmove', (x, y, event) => {
        if (!mouseDown) return;

        event.preventDefault();
        fluid.setObstacle(x, y, false);
    }, { passive: false })
    .onTouch('touchcancel', () => mouseDown = false)
    .onTouch('touchend', () => mouseDown = false)
    .append(new RadioGroup()
        .add('Tank', () => setupScene(SCENE_TYPE.TANK))
        .add('Wind Tunnel', () => setupScene(SCENE_TYPE.WIND_TUNNEL))
        .add('Paint', () => setupScene(SCENE_TYPE.PAINT))
        .add('Hires Tunnel', () => setupScene(SCENE_TYPE.HIRES_TUNNEL))
        .checked(1)
    )
    .append(new Checkbox('🏃🏻‍♀️‍➡️ Velocities')
        .on(velocitiesView)
        .withProperty("visible")
        .togetherWith(new Checkbox('✈️ Streamlines')
            .on(streamlinesView)
            .withProperty("visible")))
    .append(new Checkbox('🗜️ Pressure')
        .on(pressureView)
        .withProperty("visible")
        .onChange(checked => {
            showPressure = checked;
            obstacleView.fillColor = checked ? new Colour(0x131313) : new Colour(0x333333);
            smokeMapper.color = checked ? smokePressureColor : smokeColor;
            smokeView.opacityFunction = checked ? value => Math.sqrt(value) : value => 1 - Math.sqrt(value);
        })
        .togetherWith(new Checkbox('🚬 Smoke')
            .on(smokeView)
            .withProperty("visible")))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Scientific)
        .onChange(value =>
            pressureView.colorMapper = ColorMappers.get(value, { colorSpace: LinearSRGBColorSpace })))
    .append(new Slider('🏃🏻‍♀️‍➡️ Fluid velocity')
        .withRange(new Range(.5, 3, .01))
        .onInput(value => setFluidVelocity(value)))
    .append(new Slider('🧘🏻‍♀️ Over-relaxation')
        .withRange(new Range(1.0, 1.95, 0.01))
        .on(solver)
        .withProperty("overRelaxation"))
    .start();

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'p':
            paused = !paused;
            break;
        case 's':
            paused = false;
            simulate();
            paused = true;
            break;
    }
});