import {
    Checkbox, ColorMappers, DiscreteScalarField, ColorMapper, DiscreteVectorField, Circle, VelocitiesView, Slider, Vec2,
    DropdownMenu, Interval, RadialSymmetricBody, RadioGroup, Simulation, Solver, Colour, Range, StreamlinesView
} from '../../../src/index.js';
import { Renderable2D } from '../../../src/view/renderer.js';
import {
    Color, DataTexture, DoubleSide, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, PlaneGeometry, RGBAFormat
} from 'three';

const U_FIELD = 0; // x-component of velocity
const V_FIELD = 1; // y-component of velocity
const S_FIELD = 2; // smoke field
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

    /**
     * @param {EulerFluid} fluid
     * @param {number} i
     * @param {number} j
     * @param {any} dt
     */
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

    /**
     * @param {EulerFluid} fluid
     * @param {number} i
     * @param {number} j
     * @param {number} dt
     */
    _advectSmokeAt(fluid, i, j, dt) {
        if (fluid.obstacleMaskAt(j, i) === SOLID)
            return;

        const delta = fluid.cellSize;
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

    step(/** @type {EulerFluid} */ fluid, /** @type {number} */ dt) {
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
        super();
        this.density = 0;
        this._cellSize = 0;
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
        this.density = density;
        this._nx = resolution + 2;
        this._ny = resolution + 2;
        this._cellSize = 1 / resolution;

        this._vectorComponentX = new DiscreteScalarField({ nx: this.nx, ny: this.ny });
        this._vectorComponentY = new DiscreteScalarField({ nx: this.nx, ny: this.ny });
        // Unused z-component of velocity vector, but needs to be initialized too,
        // otherwise valueAt() won't work properly anymore, as the indices run out of bounds!
        this._vectorComponentZ = new DiscreteScalarField({ nx: this.nx, ny: this.ny });

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

    /**
     * @param {number} i
     * @param {number} j
     * @param {number} cp
     * @param {number} overRelaxation
     */
    solveGridBox(i, j, cp, overRelaxation) {
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
        const cp = this.density * this._cellSize / dt;
        for (let iter = 0; iter < numIters; iter++)
            for (let i = 1; i < this.nx - 1; i++)
                for (let j = 1; j < this.ny - 1; j++)
                    this.solveGridBox(i, j, cp, overRelaxation);
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
    get cellSize() { return this._cellSize; }

    sample(positionVector, velocity) {
        velocity.set(
            this._sampleField(positionVector.x, positionVector.y, U_FIELD),
            this._sampleField(positionVector.x, positionVector.y, V_FIELD)
        );
        return velocity;
    }

    contains(/** @type {Vec2} */ aVector) {
        return aVector.x >= 0 && aVector.x < this.nx * this._cellSize && aVector.y >= 0 && aVector.y < this.ny * this._cellSize;
    }

    sampleSmoke(/** @type {number} */ x, /** @type {number} */ y) { return this._sampleField(x, y, S_FIELD); }
    pressureAt(/** @type {number} */ i, /** @type {number} */ j) { return this._pressureField.valueAt(i, j); }
    smokeAt(/** @type {number} */ i, /** @type {number} */ j) { return this._smokeField.valueAt(i, j); }
    obstacleMaskAt(/** @type {number} */ i, /** @type {number} */ j) { return this._obstacleMask.valueAt(i, j); }

    _sampleField(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ fieldType) {
        const h = this._cellSize;
        const h1 = 1.0 / h;
        const h2 = 0.5 * h;

        let dx = 0.0;
        let dy = 0.0;
        let field;
        switch (fieldType) {
            case U_FIELD:
                field = this._vectorComponentX;
                dy = h2;
                break;
            case V_FIELD:
                field = this._vectorComponentY;
                dx = h2;
                break;
            case S_FIELD:
                field = this._smokeField;
                dx = h2;
                dy = h2;
                break;
        }

        x = Math.max(Math.min(x, this.nx * h), h) - dx;
        y = Math.max(Math.min(y, this.ny * h), h) - dy;
        const x0 = Math.min(Math.floor(x * h1), this.nx - 1);
        const tx = (x - x0 * h) * h1;
        const x1 = Math.min(x0 + 1, this.nx - 1);

        const y0 = Math.min(Math.floor(y * h1), this.ny - 1);
        const ty = (y - y0 * h) * h1;
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
        let x = i * this._cellSize;
        let y = (j + .5) * this._cellSize;
        x -= dt * this._vectorComponentX.valueAt(j, i);
        y -= dt * this._averageVelocityY(i, j);
        return this._sampleField(x, y, U_FIELD);
    }

    calculateVelocityY(/** @type {number} */ i, /** @type {number} */ j, /** @type {number} */ dt) {
        let x = (i + .5) * this._cellSize;
        let y = j * this._cellSize;
        x -= dt * this._averageVelocityX(i, j);
        y -= dt * this._vectorComponentY.valueAt(j, i);
        return this._sampleField(x, y, V_FIELD);
    }

    setObstacle(/** @type {number} */ x, /** @type {number} */ y, /** @type {boolean} */ reset) {
        let vx = 0.0;
        let vy = 0.0;

        if (!reset) {
            vx = (x - obstacle.position.x) / dt;
            vy = (y - obstacle.position.y) / dt;
        }

        obstacle.position.set(x, y);
        const r = obstacle.radius;

        for (let i = 1; i < this.nx - 2; i++)
            for (let j = 1; j < this.ny - 2; j++) {
                this._obstacleMask.setValueAt(j, i, FLUID);

                const dx = (i + 0.5) * this._cellSize - x;
                const dy = (j + 0.5) * this._cellSize - y;
                if (dx * dx + dy * dy > r * r)
                    continue;

                this._obstacleMask.setValueAt(j, i, SOLID);
                if (sceneType === SCENE_TYPE.PAINT)
                    this._smokeField.setValueAt(j, i, 0.5 + 0.5 * Math.sin(0.1 * frameNr));
                else
                    this._smokeField.setValueAt(j, i, 1.0);

                this._vectorComponentX.setValueAt(j, i, vx);
                this._vectorComponentX.setValueAt(j, i + 1, vx);
                this._vectorComponentY.setValueAt(j, i, vy);
                this._vectorComponentY.setValueAt(j + 1, i, vy);
            }
    }

    evolve(/** @type {Solver} */ solver, /** @type {number} */ dt) {
        solver.step(this, dt);
    }
}

/**
 * Renders the pressure/smoke field as a Three.js data texture.
 *
 * The texture is stretched over the same centered world-space domain used by
 * the Three.js scene. Its rows follow the fluid grid's y-axis (j = 0 at the
 * bottom), while the simulation itself remains independent of the renderer.
 */
class SmokePressureView extends Renderable2D {
    constructor({
        showPressure = true,
        showSmoke = true,
    } = {}) {
        super();
        this._showPressure = showPressure;
        this._showSmoke = showSmoke;
        this._width = 0;
        this._height = 0;
        this._pixels = new Uint8Array();
        this._texture = null;
        this._mesh = null;

        this._color = new Color();
        this._colorMapper = ColorMappers.get(ColorMappers.RdYlBu, { colorSpace: LinearSRGBColorSpace });
    }

    set showSmoke(/** @type {boolean} */ showSmoke) { this._showSmoke = showSmoke; }
    set showPressure(/** @type {boolean} */ showPressure) { this._showPressure = showPressure; }
    set colorMapper(/** @type {ColorMapper} */ colorMapper) { this._colorMapper = colorMapper; }

    canBindTo(/** @type {{nx:number, ny:number, pressureRange:Interval}} */ model) {
        if (model.pressureRange === undefined ||
            model.nx === undefined ||
            model.ny === undefined)
            throw new Error('Fluid velocities view can only bind to models that behave as a fluid model');

        return true;
    }

    initialize(/** @type {{nx:number, ny:number, pressureRange:Interval}} */ fluid) {
        this.dispose();
        this._width = fluid.nx;
        this._height = fluid.ny;
        this._pixels = new Uint8Array(this._width * this._height * 4);
        this._texture = new DataTexture(this._pixels, this._width, this._height, RGBAFormat);
        this._texture.colorSpace = LinearSRGBColorSpace;
        this._texture.needsUpdate = true;

        this._mesh = new Mesh(
            new PlaneGeometry(1, 1),
            new MeshBasicMaterial({
                map: this._texture,
                transparent: true,
                depthWrite: false,
                side: DoubleSide
            })
        );

        // All fluid views use model coordinates with their origin at the
        // lower-left. Center the plane in local coordinates, then apply the
        // same translation as the obstacle, velocity vectors, and streamlines.
        this._mesh.position.set(.5, .5, 0);
        this.add(this._mesh);
    }

    /**
     * @param {number} i
     * @param {number} j
     * @param {EulerFluid} fluid
     * @param {Interval} pressureRange
     */
    _updatePixelAt(i, j, fluid, pressureRange) {
        const offset = 4 * (j * this._width + i);
        const smoke = fluid.smokeAt(j, i);
        let alpha = 0;

        if (this._showPressure) {
            this._colorMapper.map(pressureRange.normalize(fluid.pressureAt(j, i)), this._color);
            if (this._showSmoke)
                this._color.setRGB(
                    Math.max(0.0, this._color.r - smoke),
                    Math.max(0.0, this._color.g - smoke),
                    Math.max(0.0, this._color.b - smoke));
            alpha = 55 + (sceneType === SCENE_TYPE.TANK ? 1 : 1 - smoke) * 200;
        } else if (this._showSmoke) {
            this._color.setRGB(smoke, smoke, smoke);
            if (sceneType === SCENE_TYPE.PAINT)
                this._colorMapper.map(smoke, this._color);
            alpha = 55 + (sceneType === SCENE_TYPE.TANK ? 1 : 1 - smoke) * 200;
        } else if (fluid.obstacleMaskAt(j, i) === SOLID) {
            this._color.setRGB(0, 0, 0);
            alpha = 255;
        } else
            this._color.setRGB(0, 0, 0);

        this._pixels[offset] = Math.round(255 * this._color.r);
        this._pixels[offset + 1] = Math.round(255 * this._color.g);
        this._pixels[offset + 2] = Math.round(255 * this._color.b);
        this._pixels[offset + 3] = Math.round(alpha);
    }

    synchronizeWith(/** @type {{nx:number, ny:number, pressureRange: Interval}} */ fluid) {
        if (!this._texture || this._width !== fluid.nx || this._height !== fluid.ny)
            this.initialize(fluid);

        const pressureRange = fluid.pressureRange;
        for (let j = 0; j < fluid.ny; j++)
            for (let i = 0; i < fluid.nx; i++)
                this._updatePixelAt(i, j, fluid, pressureRange);

        this._texture.needsUpdate = true;
    }

    dispose() {
        if (this._mesh) {
            this.remove(this._mesh);
            this._mesh.geometry.dispose();
            this._mesh.material.dispose();
            this._mesh = null;
        }
        this._texture?.dispose();
        this._texture = null;
        this._pixels = new Uint8Array();
    }
}

//
// S C E N E
//
let dt = 1.0 / 120;
let paused = false;
/** @type {number} */
let sceneType = SCENE_TYPE.WIND_TUNNEL;
let frameNr = 0;
let showPressure = true;
let mouseDown = false;
let gravity = -9.81;
let fluidSpeed = 2.0;
const fluid = new EulerFluid();

function tankScene(/** @type {EulerFluid} */ fluid) {
    for (let i = 0; i < fluid.nx; i++)
        for (let j = 0; j < fluid.ny; j++)
            fluid._obstacleMask.setValueAt(j, i, (i === 0 || i === fluid.nx - 1 || j === 0) ? SOLID : FLUID);

    gravity = -9.81;
    solver.overRelaxation = 1.9;
    fluidDynamicsView.showPressure = true;
    obstacleView.fillColor = new Colour(0x131313);
    fluidDynamicsView.showSmoke = false;
    streamlinesView.visible = false;
    velocitiesView.visible = false;
}

function setFluidVelocity(/** @type {number} */ speed) {
    fluidSpeed = speed;
    for (let j = 0; j < fluid.ny; j++)
        fluid._vectorComponentX.setValueAt(j, 1, speed);
}

function vortexSheddingScene(/** @type {EulerFluid} */ fluid,  /** @type {number} */ fluidSpeed, /** @type {number} */ sceneNumber) {
    for (let i = 0; i < fluid.nx; i++)
        for (let j = 0; j < fluid.ny; j++)
            fluid._obstacleMask.setValueAt(j, i, (i === 0 || j === 0 || j === fluid.ny - 1) ? SOLID : FLUID);

    setFluidVelocity(fluidSpeed);

    const pipeH = 0.1 * fluid.ny;
    const minJ = Math.floor(0.5 * fluid.ny - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * fluid.ny + 0.5 * pipeH);
    for (let j = minJ; j < maxJ; j++)
        fluid._smokeField.setValueAt(j, 0, 0.0);

    fluid.setObstacle(0.4, 0.5, true);
    gravity = 0.0;
    solver.overRelaxation = 1.9;
    fluidDynamicsView.showPressure = true;
    obstacleView.fillColor = new Colour(0x131313);
    fluidDynamicsView.showSmoke = true;
    streamlinesView.visible = false;
    velocitiesView.visible = false;
    if (sceneNumber === SCENE_TYPE.HIRES_TUNNEL)
        setHighResolution();
}

function paintScene() {
    gravity = 0.0;
    solver.overRelaxation = 1.0;
    fluidDynamicsView.showPressure = false;
    obstacleView.fillColor = new Colour(0x131313);
    fluidDynamicsView.showSmoke = true;
    streamlinesView.visible = false;
    velocitiesView.visible = false;
    obstacle.radius = 0.1;
}

function setHighResolution() {
    dt = 1.0 / 125.0;
    solver.numIterations = 25;
    fluidDynamicsView.showPressure = true;
    obstacleView.fillColor = new Colour(0x131313);
}

function setupScene(/** @type {number} */ sceneNr = 0) {
    sceneType = sceneNr;
    frameNr = 0;
    let resolution = 100;
    if (sceneNr === SCENE_TYPE.TANK)
        resolution = 50;
    else if (sceneNr === SCENE_TYPE.HIRES_TUNNEL)
        resolution = 200;

    dt = 1.0 / 60.0;
    obstacle.radius = 0.15;
    fluid.init({ resolution });
    solver.init(fluid);
    solver.numIterations = 40;
    obstacleView.radiusOffset = fluid.cellSize;

    if (sceneNr === SCENE_TYPE.TANK)
        tankScene(fluid);
    else if (sceneNr === SCENE_TYPE.WIND_TUNNEL || sceneNr === SCENE_TYPE.HIRES_TUNNEL)
        vortexSheddingScene(fluid, fluidSpeed, sceneNr);
    else if (sceneNr === SCENE_TYPE.PAINT)
        paintScene();
}

const streamlinesView = new StreamlinesView();
const fluidDynamicsView = new SmokePressureView();
const velocitiesView = new VelocitiesView();
const obstacleView = new Circle({ radiusOffset: fluid.cellSize });

document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'p':
            paused = !paused;
            break;
        case 'm':
            paused = false;
            simulate();
            paused = true;
            break;
    }
});

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
                '©️ Original idea and software: ' +
                '<a href=\"https://www.matthiasMueller.info/tenMinutePhysics\">Matthias Müller</a></br>' +
                '👉 Use mouse to move obstacle.<br>' +
                '👉 Use \"p\" and \"m\" keys to pause and/or step'
        }
    })
    .runsEvery(3e-2)
    .onStep(() => simulate())
    .bind(fluid.alwaysWith(fluidDynamicsView))
    .bind(fluid.alwaysWith(streamlinesView))
    .bind(fluid.alwaysWith(velocitiesView))
    .bind(obstacle.alwaysWith(obstacleView))
    .frameSceneOn(fluidDynamicsView, { padding: 1.0 })
    /* Mouse event handling */
    .onMouse('mouseup', () => mouseDown = false)
    .onMouse('mouseleave', () => mouseDown = false)
    .onMouse('mousedown', (x, y, _event) => {
        mouseDown = true;
        fluid.setObstacle(x, y, true);
    })
    .onMouse('mousemove', (x, y, _event) => {
        if (!mouseDown)
            return;

        fluid.setObstacle(x, y, false);
    })
    /* Mobile devices event handling */
    .onMouse('touchstart', (x, y, event) => {
        if (!event.touches.length)
            return;

        mouseDown = true;
        fluid.setObstacle(x, y, true);
    }, { passive: true })
    .onMouse('touchmove', (x, y, event) => {
        if (!event.touches.length || !mouseDown)
            return;

        fluid.setObstacle(x, y, false);
    }, { passive: false })
    .onMouse('touchcancel', () => mouseDown = false)
    .onMouse('touchend', () => mouseDown = false)
    .append(new RadioGroup()
        .add('Tank', () => setupScene(SCENE_TYPE.TANK))
        .add('Wind Tunnel', () => setupScene(SCENE_TYPE.WIND_TUNNEL))
        .add('Paint', () => setupScene(SCENE_TYPE.PAINT))
        .add('Hires Tunnel', () => setupScene(SCENE_TYPE.HIRES_TUNNEL))
        .checked(1)
    )
    .append(new Checkbox('🏃🏻‍♀️‍➡️ Velocities')
        .onChange(event => velocitiesView.visible = event.target.checked)
        .togetherWith(new Checkbox('Streamlines')
            .onChange(event => streamlinesView.visible = event.target.checked)
        ))
    .append(new Checkbox('🗜️ Pressure')
        .checked(showPressure)
        .onChange(event => {
            showPressure = event.target.checked;
            fluidDynamicsView.showPressure = showPressure;
            obstacleView.fillColor = showPressure ? new Colour(0x131313) : new Colour(0xDDDDDD);
        }).togetherWith(new Checkbox('🚬 Smoke')
            .checked(true)
            .onChange(event => fluidDynamicsView.showSmoke = event.target.checked)))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.RdYlBu)
        // @ts-ignore
        .onChange(event =>
            fluidDynamicsView.colorMapper = ColorMappers.get(event.target.value, { colorSpace: LinearSRGBColorSpace })))
    .append(new Slider('🏃🏻‍♀️‍➡️ Fluid velocity')
        .withRange(new Range(.5, 3, .01))
        .withValue(fluidSpeed)
        .onInput(event => setFluidVelocity(Number(event.target.value))))
    .append(new Slider('🧘🏻‍♀️ Over-relaxation')
        .on(solver)
        .withProperty("overRelaxation")
        .withRange(new Range(1.0, 1.95, 0.01))
        .withValue(solver.overRelaxation))
    .start();
