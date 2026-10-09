import {
    Checkbox, ColorMappers, DiscreteScalarField, ColorMapper,
    DropdownMenu, Interval, RadialSymmetricBody, RadioGroup, Simulation, Solver, Colour
} from '../../../src/index.js';
import {Field} from '../../../src/model/math/fields.js';
import {Renderable2D, Renderable3D} from '../../../src/view/renderer.js';
import {BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, LineBasicMaterial, LineSegments, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, RingGeometry} from 'three';

const helionDiv = document.getElementById('eulerFluidContainer');
const canvas = document.getElementById('myCanvas');
helionDiv.style.width = `${canvas.width}px`;
const display = canvas.getContext('2d', { willReadFrequently: true });
canvas.focus();

const simulationHeight = 1.1;
const canvasScale = canvas.height / simulationHeight;
const simulationWidth = canvas.width / canvasScale;

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

const scaleX = (/** @type {number} */ x) => x * canvasScale;

const scaleY = (/** @type {number} */ y) => canvas.height - y * canvasScale;

class FluidSolver extends Solver {
    constructor({
        numIterations = 100,
        overRelaxation = 1.9
    } = {}) {
        super();
        this.numIterations = numIterations;
        this.overRelaxation = overRelaxation;
        this._newVelocityX = new DiscreteScalarField({nx: 0, ny: 0});
        this._newVelocityY = new DiscreteScalarField({nx: 0, ny: 0});
        this._newSmokeField = new DiscreteScalarField({nx: 0, ny: 0});
    }

    /**
     * @param {Fluid} fluid
     * @param {number} i
     * @param {number} j
     * @param {any} dt
     */
    _advectVelocityAt(fluid, i, j, dt) {
        if (fluid.obstacleMaskAt(j, i) !== SOLID &&
            fluid.obstacleMaskAt(j, i - 1) !== SOLID &&
            j < fluid.numY - 1)
            this._newVelocityX.setValueAt(j, i, fluid.calculateVelocityX(i, j, dt));

        if (fluid.obstacleMaskAt(j, i) !== SOLID &&
            fluid.obstacleMaskAt(j - 1, i) !== SOLID &&
            i < fluid.numX - 1)
            this._newVelocityY.setValueAt(j, i, fluid.calculateVelocityY(i, j, dt));
    }

    _advectVelocity(/** @type {Fluid} */ fluid, /** @type {number} */ dt) {
        for (let i = 1; i < fluid.numX; i++)
            for (let j = 1; j < fluid.numY; j++)
                this._advectVelocityAt(fluid, i, j, dt);
    }

    /**
     * @param {Fluid} fluid
     * @param {number} i
     * @param {number} j
     * @param {number} dt
     */
    _advectSmokeAt(fluid, i, j, dt) {
        if (fluid.obstacleMaskAt(j, i) === 0)
            return;

        const u = (fluid.xVelocityAt(j, i) + fluid.xVelocityAt(j, i + 1)) * 0.5;
        const v = (fluid.yVelocityAt(j, i) + fluid.yVelocityAt(j + 1, i)) * 0.5;
        const x = (i + .5) * fluid.h - dt * u;
        const y = (j + .5) * fluid.h - dt * v;

        this._newSmokeField.setValueAt(j, i, fluid.sampleSmoke(x, y));
    }

    _advectSmoke(/** @type {Fluid} */ fluid, /** @type {number} */ dt) {
        this._newSmokeField.data.set(fluid._smokeField.data);
        for (let i = 1; i < fluid.numX - 1; i++)
            for (let j = 1; j < fluid.numY - 1; j++)
                this._advectSmokeAt(fluid, i, j, dt);

        fluid._smokeField.data.set(this._newSmokeField.data);
    }

    step(/** @type {Fluid} */ fluid, /** @type {number} */ dt) {
        fluid._pressureField.reset();
        fluid.solveIncompressibility(this.numIterations, this.overRelaxation, dt);
        fluid.extrapolate();

        this._newVelocityX.data.set(fluid._velocityX.data);
        this._newVelocityY.data.set(fluid._velocityY.data);
        this._advectVelocity(fluid, dt);
        fluid._velocityX.data.set(this._newVelocityX.data);
        fluid._velocityY.data.set(this._newVelocityY.data);

        this._advectSmoke(fluid, dt);
    }

    init(/** @type {Fluid} */ fluid) {
        this._newVelocityX = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newVelocityY = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newSmokeField = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
    }
}

class Fluid extends Field {
    /**
     * @param {{
     *     density?: number,
     *     numX?: number,
     *     numY?: number,
     *     cellSize?: number
     * }} options
     */
    constructor({
        density = 1000,
        numX = 100,
        numY = 100,
        cellSize = 1
    } = {}) {
        super();
        this.density = 0;
        this.numX = 0;
        this.numY = 0;
        this.h = 0;
        this._velocityX = new DiscreteScalarField({nx: 0, ny: 0});
        this._velocityY = new DiscreteScalarField({nx: 0, ny: 0});
        this._pressureField = new DiscreteScalarField({nx: 0, ny: 0});
        this._obstacleMask = new DiscreteScalarField({nx: 0, ny: 0});
        this._smokeField = new DiscreteScalarField({nx: 0, ny: 0});
        this.init(density, numX, numY, cellSize);
    }

    /**
     * @param {number} density
     * @param {number} numX
     * @param {number} numY
     * @param {number} cellSize
     */
    init(density, numX, numY, cellSize) {
        this.density = density;
        this.numX = numX + 2;
        this.numY = numY + 2;
        this.h = cellSize;

        this._velocityX = new DiscreteScalarField({nx: numX + 2, ny: numY + 2});
        this._velocityY = new DiscreteScalarField({nx: numX + 2, ny: numY + 2});
        this._pressureField = new DiscreteScalarField({nx: numX + 2, ny: numY + 2});
        this._obstacleMask = new DiscreteScalarField({nx: numX + 2, ny: numY + 2});
        this._smokeField = new DiscreteScalarField({nx: numX + 2, ny: numY + 2});
        this._smokeField.data.fill(1.0)
    }

    integrate(/** @type {number} */ gravity, /** @type {number} */ dt) {
        if (gravity === 0.0)
            return;

        for (let i = 1; i < this.numX; i++)
            for (let j = 1; j < this.numY - 1; j++)
                if (this._obstacleMask.valueAt(j, i) !== SOLID && this._obstacleMask.valueAt(j - 1, i) !== SOLID)
                    this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) + gravity * dt);
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
            this._velocityX.valueAt(j, i + 1) -
            this._velocityX.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i) -
            this._velocityY.valueAt(j, i);

        let p = -div / s;
        p *= overRelaxation;
        this._pressureField.setValueAt(j, i, this._pressureField.valueAt(j, i) + cp * p);

        this._velocityX.setValueAt(j, i, this._velocityX.valueAt(j, i) - sx0 * p);
        this._velocityX.setValueAt(j, i + 1, this._velocityX.valueAt(j, i + 1) + sx1 * p);
        this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) - sy0 * p);
        this._velocityY.setValueAt(j + 1, i, this._velocityY.valueAt(j + 1, i)  + sy1 * p);
    }

    /**
     * @param {number} numIters
     * @param {number} overRelaxation
     * @param {number} dt
     */
    solveIncompressibility(numIters, overRelaxation, dt) {
        const cp = this.density * this.h / dt;
        for (let iter = 0; iter < numIters; iter++)
            for (let i = 1; i < this.numX - 1; i++)
                for (let j = 1; j < this.numY - 1; j++)
                    this.solveGridBox(i, j, cp, overRelaxation);
    }

    extrapolate() {
        for (let i = 0; i < this.numX; i++) {
            this._velocityX.setValueAt(0, i, this._velocityX.valueAt(1, i));
            this._velocityX.setValueAt(this.numY - 1, i,  this._velocityX.valueAt(this.numY - 2, i));
        }
        for (let j = 0; j < this.numY; j++) {
            this._velocityY.setValueAt(j, 0, this._velocityY.valueAt(j, 1));
            this._velocityY.setValueAt(j, this.numX - 1, this._velocityY.valueAt(j, this.numX - 2));
        }
    }

    get pressureRange() { return this._pressureField.rangeAt(); }

    sampleVelocityX(/** @type {number} */ x, /** @type {number} */ y) { return this._sampleField(x, y, U_FIELD); }
    sampleVelocityY(/** @type {number} */ x, /** @type {number} */ y) { return this._sampleField(x, y, V_FIELD); }
    sampleSmoke(/** @type {number} */ x, /** @type {number} */ y)     { return this._sampleField(x, y, S_FIELD); }
    pressureAt(/** @type {number} */ i, /** @type {number} */ j)      { return this._pressureField.valueAt(i, j); }
    smokeAt(/** @type {number} */ i, /** @type {number} */ j)         { return this._smokeField.valueAt(i, j); }
    obstacleMaskAt(/** @type {number} */ i, /** @type {number} */ j)  { return this._obstacleMask.valueAt(i, j); }
    xVelocityAt(/** @type {number} */ i, /** @type {number} */ j)     { return this._velocityX.valueAt(i, j); }
    yVelocityAt(/** @type {number} */ i, /** @type {number} */ j)     { return this._velocityY.valueAt(i, j); }

    _sampleField(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ fieldType) {
        const h = this.h;
        const h1 = 1.0 / h;
        const h2 = 0.5 * h;

        let dx = 0.0;
        let dy = 0.0;
        let f;
        switch (fieldType) {
            case U_FIELD:
                f = this._velocityX;
                dy = h2;
                break;
            case V_FIELD:
                f = this._velocityY;
                dx = h2;
                break;
            case S_FIELD:
                f = this._smokeField;
                dx = h2;
                dy = h2;
                break;
        }

        x = Math.max(Math.min(x, this.numX * h), h) - dx;
        y = Math.max(Math.min(y, this.numY * h), h) - dy;
        const x0 = Math.min(Math.floor(x * h1), this.numX - 1);
        const tx = (x - x0 * h) * h1;
        const x1 = Math.min(x0 + 1, this.numX - 1);

        const y0 = Math.min(Math.floor(y * h1), this.numY - 1);
        const ty = (y - y0 * h) * h1;
        const y1 = Math.min(y0 + 1, this.numY - 1);

        const sx = 1.0 - tx;
        const sy = 1.0 - ty;

        return sx * sy * f.valueAt(y0, x0) +
            tx * sy * f.valueAt(y0, x1) +
            tx * ty * f.valueAt(y1, x1) +
            sx * ty * f.valueAt(y1, x0);
    }

    _averageVelocityX(/** @type {number} */ i, /** @type {number} */ j) {
        return (
            this._velocityX.valueAt(j - 1, i) +
            this._velocityX.valueAt(j, i) +
            this._velocityX.valueAt(j - 1, i + 1) +
            this._velocityX.valueAt(j, i + 1)
        ) * 0.25;
    }

    _averageVelocityY(/** @type {number} */ i, /** @type {number} */ j) {
        return (
            this._velocityY.valueAt(j, i - 1) +
            this._velocityY.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i - 1) +
            this._velocityY.valueAt(j + 1, i)
        ) * 0.25;
    }

    calculateVelocityX(/** @type {number} */ i, /** @type {number} */ j, /** @type {number} */ dt) {
        let x = i * this.h;
        let y = (j + .5) * this.h;
        x -= dt * this._velocityX.valueAt(j, i);
        y -= dt * this._averageVelocityY(i, j);
        return this.sampleVelocityX(x, y);
    }

    calculateVelocityY(/** @type {number} */ i, /** @type {number} */ j, /** @type {number} */ dt) {
        let x = (i + .5) * this.h;
        let y = j * this.h;
        x -= dt * this._averageVelocityX(i, j);
        y -= dt * this._velocityY.valueAt(j, i);
        return this.sampleVelocityY(x, y);
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

        for (let i = 1; i < this.numX - 2; i++)
            for (let j = 1; j < this.numY - 2; j++) {
                this._obstacleMask.setValueAt(j, i, FLUID);

                const dx = (i + 0.5) * this.h - x;
                const dy = (j + 0.5) * this.h - y;
                if (dx * dx + dy * dy > r * r)
                    continue;

                this._obstacleMask.setValueAt(j, i, SOLID);
                if (sceneType === SCENE_TYPE.PAINT)
                    this._smokeField.setValueAt(j, i, 0.5 + 0.5 * Math.sin(0.1 * frameNr));
                else
                    this._smokeField.setValueAt(j, i, 1.0);

                this._velocityX.setValueAt(j, i, vx);
                this._velocityX.setValueAt(j, i + 1, vx);
                this._velocityY.setValueAt(j, i, vy);
                this._velocityY.setValueAt(j + 1, i, vy);
            }
    }

    evolve(/** @type {Solver} */ solver, /** @type {number} */ dt) {
        solver.step(this, dt);
    }
}

//
// V I E W S
//
class Circle extends Renderable3D {
    constructor({
        height,
        radiusOffset = 0,
        fillColor = new Colour(0x131313),
        borderColor = Colour.Black,
        borderWidth = 0.05,
    } = {}) {
        super();
        this._canvasScale = height / simulationHeight;
        this._radiusOffset = radiusOffset;
        this._radius = -1;

        this._fillMaterial = new MeshBasicMaterial({ side: DoubleSide });
        this._outlineMaterial = new MeshBasicMaterial({ side: DoubleSide });
        fillColor.asThreeJsColor(this._fillMaterial.color);
        borderColor.asThreeJsColor(this._outlineMaterial.color);

        this._fillMesh = new Mesh(new CircleGeometry(1, 64), this._fillMaterial);
        this._outlineMesh = new Mesh(
            new RingGeometry(1, 1 + borderWidth, 64),
            this._outlineMaterial
        );
        this.add(this._fillMesh, this._outlineMesh);
    }

    set fillColor(/** @type {Colour} */ colour) { colour.asThreeJsColor(this._fillMaterial.color); }
    set radiusOffset(/** @type {number} */ value) { this._radiusOffset = value; }

    canBindTo(/** @type {RadialSymmetricBody} */ model) {
        if (model.radius === undefined)
            throw new Error('Circle can only bind to models that have a radius property');
        return true;
    }

    synchronizeWith(/** @type {RadialSymmetricBody} */ obstacle) {
        const radius = obstacle.radius + this._radiusOffset;
        this._fillMesh.scale.setScalar(radius);
        this._outlineMesh.scale.setScalar(radius);
        this.position.set(obstacle.position.x - simulationWidth / 2, obstacle.position.y - simulationHeight / 2, 0.01);
    }
}

/**
 * Supplies real geometry for camera framing. The fluid fields are still
 * drawn on the existing 2D canvas, but they share this world-space domain.
 */
class FluidDomainView extends Renderable3D {
    constructor() {
        super();
        this.add(new Mesh(
            new BoxGeometry(simulationWidth, simulationHeight, 0.001),
            new MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                colorWrite: false,
                depthWrite: false
            })
        ));
    }

    canBindTo(/** @type {Fluid} */ _fluid) { return true; }
    synchronizeWith(/** @type {Fluid} */ _fluid) {}
}

class FluidDynamicsVelocitiesView extends Renderable2D {
    constructor({display, scale = 0.2} = {}) {
        super();
        this._scale = scale
        this._display = display;
    }

    canBindTo(/** @type {Fluid} */ _model) {
        return true;
    }

    synchronizeWith(/** @type {Fluid} */ fluid) {
        this._display.strokeStyle = '#000000';
        const scale = this._scale;
        const h = fluid.h;
        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++) {
                this._display.beginPath();

                const x0 = scaleX(i * h);
                const x1 = scaleX(i * h + fluid.xVelocityAt(j, i) * scale);
                const y = scaleY((j + 0.5) * h);

                this._display.moveTo(x0, y);
                this._display.lineTo(x1, y);
                this._display.stroke();

                const x = scaleX((i + 0.5) * h);
                const y0 = scaleY(j * h);
                const y1 = scaleY(j * h + fluid.yVelocityAt(j, i) * scale)

                this._display.beginPath();
                this._display.moveTo(x, y0);
                this._display.lineTo(x, y1);
                this._display.stroke();
            }
    }
}

class FluidStreamlinesView extends Renderable3D {
    constructor({numberOfSegments = 15, seedSpacing = 5} = {}) {
        super();
        this._numberOfSegments = numberOfSegments;
        this._seedSpacing = seedSpacing;
        this._geometry = new BufferGeometry();
        this._material = new LineBasicMaterial({color: 0x000000});
        this._lines = new LineSegments(this._geometry, this._material);
        this.add(this._lines);
        this._allocatedSegmentCount = 0;
    }

    canBindTo(/** @type {Fluid} */ _model) {
        return true;
    }

    synchronizeWith(/** @type {Fluid} */ fluid) {
        const seedSpacing = this._seedSpacing;
        const numberOfSegments = this._numberOfSegments;
        const seedCountX = Math.ceil((fluid.numX - 2) / seedSpacing);
        const seedCountY = Math.ceil((fluid.numY - 2) / seedSpacing);
        const maxSegmentCount = seedCountX * seedCountY * numberOfSegments;

        if (maxSegmentCount !== this._allocatedSegmentCount) {
            this._geometry.dispose();
            this._geometry = new BufferGeometry();
            this._geometry.setAttribute(
                'position',
                new BufferAttribute(new Float32Array(maxSegmentCount * 2 * 3), 3)
            );
            this._lines.geometry = this._geometry;
            this._allocatedSegmentCount = maxSegmentCount;
        }

        const positions = this._geometry.getAttribute('position').array;
        let segmentCount = 0;
        const halfWidth = simulationWidth / 2;
        const halfHeight = simulationHeight / 2;

        for (let i = 1; i < fluid.numX - 1; i += seedSpacing)
            for (let j = 1; j < fluid.numY - 1; j += seedSpacing) {
                let x = (i + 0.5) * fluid.h;
                let y = (j + 0.5) * fluid.h;

                for (let n = 0; n < numberOfSegments; n++) {
                    if (x < 0 || x > fluid.numX * fluid.h ||
                        y < 0 || y > fluid.numY * fluid.h)
                        break;

                    const x0 = x;
                    const y0 = y;
                    x += fluid.sampleVelocityX(x, y) * 0.01;
                    y += fluid.sampleVelocityY(x, y) * 0.01;

                    const offset = segmentCount * 6;
                    positions[offset] = x0 - halfWidth;
                    positions[offset + 1] = y0 - halfHeight;
                    positions[offset + 2] = 0.005;
                    positions[offset + 3] = x - halfWidth;
                    positions[offset + 4] = y - halfHeight;
                    positions[offset + 5] = 0.005;
                    segmentCount++;
                }
            }

        this._geometry.getAttribute('position').needsUpdate = true;
        this._geometry.setDrawRange(0, segmentCount * 2);
        this._geometry.computeBoundingSphere();
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
    }
}

/**
 * Visualizes the pressure/smoke/obstacle combination used by the 2D fluid solver.
 *
 * The pressure field is the model bound to this view. The smoke and obstacle
 * fields are additional state needed to reproduce the fluid visualization.
 */
class FluidDynamicsView extends Renderable2D {
    constructor(display, width, height) {
        super();
        this._imageData = display.getImageData(0, 0, width, height);
        this._display = display;
        this._showPressure = true;
        this._showSmoke = true;
        this._height = height;
        this._width = width;
        this._canvasScale = height / simulationHeight;
        this._color = new Color();
        this._colorMapper = ColorMappers.get(ColorMappers.Scientific, {colorSpace: LinearSRGBColorSpace});
    }

    set showSmoke(/** @type {boolean} */ showSmoke) { this._showSmoke = showSmoke; }
    set showPressure(/** @type {boolean} */ showPressure) { this._showPressure = showPressure; }
    set colorMapper(/** @type {ColorMapper} */ colorMapper) { this._colorMapper = colorMapper; }

    /**
     * @param {number} i
     * @param {number} j
     * @param {Fluid} fluid
     * @param {Interval} pressureRange
     */
    _updateImageDataAt(i, j, fluid, pressureRange) {
        const cellScale = 1.1;
        const h = fluid.h;

        const smoke = fluid.smokeAt(j, i);
        if (this._showPressure) {
            this._colorMapper.map(pressureRange.normalize(fluid.pressureAt(j, i)), this._color);
            if (this._showSmoke)
                this._color.setRGB(
                    Math.max(0.0, this._color.r - smoke),
                    Math.max(0.0, this._color.g - smoke),
                    Math.max(0.0, this._color.b - smoke));
        } else if (this._showSmoke) {
            this._color.setRGB(smoke, smoke, smoke);
            if (sceneType === SCENE_TYPE.PAINT)
                this._colorMapper.map(smoke, this._color);
        } else if (fluid.obstacleMaskAt(j, i) === 0.0)
            this._color.setRGB(0, 0, 0);

        const x = Math.floor(scaleX(i * h));
        const y = Math.floor(scaleY((j + 1) * h));
        const cx = Math.floor(this._canvasScale * cellScale * h) + 1;
        const cy = Math.floor(this._canvasScale * cellScale * h) + 1;

        for (let yi = y; yi < y + cy; yi++) {
            let pos = 4 * (yi * this._width + x);

            for (let xi = 0; xi < cx; xi++) {
                this._imageData.data[pos++] = 255 * this._color.r; // red
                this._imageData.data[pos++] = 255 * this._color.g; // green
                this._imageData.data[pos++] = 255 * this._color.b; // blue
                this._imageData.data[pos++] = 255; // opacity (always opaque)
            }
        }
    }

    canBindTo(/** @type {Fluid} */ model) {
        return true;
    }

    synchronizeWith(/** @type {Fluid} */ fluid) {
        const pressureRange = fluid.pressureRange;
        this._display.clearRect(0, 0, this._width, this._height);
        this._display.fillStyle = '#FF0000';

        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++)
                this._updateImageDataAt(i, j, fluid, pressureRange);

        this._display.putImageData(this._imageData, 0, 0);

        if (this._showPressure) {
            const pressureText = 'pressure: ' + pressureRange.min.toFixed(0) + ' - ' + pressureRange.max.toFixed(0) + ' N/m';
            this._display.fillStyle = '#A0A0A0';
            this._display.font = '16px Arial';
            this._display.fillText(pressureText, 10, 35);
        }
    }
}

//
// S C E N E
//
let dt = 1.0 / 120;
let paused = false;
let sceneType = SCENE_TYPE.WIND_TUNNEL
let frameNr = 0;
let mouseDown = false;
let gravity = -9.81;
const fluid = new Fluid();

function tankScene(/** @type {Fluid} */ fluid) {
    for (let i = 0; i < fluid.numX; i++)
        for (let j = 0; j < fluid.numY; j++)
            fluid._obstacleMask.setValueAt(j, i, (i === 0 || i === fluid.numX - 1 || j === 0) ? SOLID : FLUID);

    gravity = -9.81;
    solver.overRelaxation = 1.9;
    fluidDynamicsView.showPressure = true;
    obstacleView.fillColor = new Colour(0x131313);
    fluidDynamicsView.showSmoke = false;
    streamlinesView.visible = false;
    velocitiesView.visible = false;
}

/**
 * @param {Fluid} fluid
 * @param {number} i
 * @param {number} j
 */
function updateSmokeFieldInVortexScene(fluid, i, j) {
    fluid._obstacleMask.setValueAt(j, i, (i === 0 || j === 0 || j === fluid.numY - 1) ? SOLID : FLUID);

    const inwardVelocity = 2.0;
    if (i === 1)
        fluid._velocityX.setValueAt(j, i, inwardVelocity);
}

function vortexSheddingScene(/** @type {Fluid} */ fluid, /** @type {number} */ sceneNumber) {
    for (let i = 0; i < fluid.numX; i++)
        for (let j = 0; j < fluid.numY; j++)
            updateSmokeFieldInVortexScene(fluid, i, j);

    const pipeH = 0.1 * fluid.numY;
    const minJ = Math.floor(0.5 * fluid.numY - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * fluid.numY + 0.5 * pipeH);
    for (let j = minJ; j < maxJ; j++)
        fluid._smokeField.data[j] = 0.0;

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

    const domainHeight = 1.0;
    const domainWidth = domainHeight / simulationHeight * simulationWidth;
    const dy = domainHeight / resolution;

    const numX = Math.floor(domainWidth / dy);
    const numY = Math.floor(domainHeight / dy);

    /** !! CRITICAL INIT STATEMENTS */
    // Todo enforce in an init routine?
    dt = 1.0 / 60.0;
    obstacle.radius = 0.15;
    const density = 1000.0;
    fluid.init(density, numX, numY, dy);
    solver.init(fluid);
    obstacleView.radiusOffset = dy;
    /**                             */

    if (sceneNr === SCENE_TYPE.TANK)
        tankScene(fluid);
    else if (sceneNr === SCENE_TYPE.WIND_TUNNEL || sceneNr === SCENE_TYPE.HIRES_TUNNEL)
        vortexSheddingScene(fluid, sceneNr);
    else if (sceneNr === SCENE_TYPE.PAINT)
        paintScene();
}

const streamlinesView = new FluidStreamlinesView();
const fluidDynamicsView = new FluidDynamicsView(display, canvas.width, canvas.height);
const velocitiesView = new FluidDynamicsVelocitiesView({ display });
const obstacleView = new Circle({
    height: canvas.height,
    radiusOffset: fluid.h
});
const fluidDomainView = new FluidDomainView();

function startDrag(/** @type {number} */ x, /** @type {number} */ y) {
    let bounds = canvas.getBoundingClientRect();

    let mx = x - bounds.left - canvas.clientLeft;
    let my = y - bounds.top - canvas.clientTop;
    mouseDown = true;

    x = mx / canvasScale;
    y = (canvas.height - my) / canvasScale;

    fluid.setObstacle(x, y, true);
}

function drag(/** @type {number} */ x, /** @type {number} */ y) {
    if (!mouseDown)
        return;
    let bounds = canvas.getBoundingClientRect();
    let mx = x - bounds.left - canvas.clientLeft;
    let my = y - bounds.top - canvas.clientTop;
    x = mx / canvasScale;
    y = (canvas.height - my) / canvasScale;
    fluid.setObstacle(x, y, false);
}

canvas.addEventListener('mousedown', event => startDrag(event.x, event.y));
canvas.addEventListener('mouseup', event => mouseDown = false);
canvas.addEventListener('mousemove', event => drag(event.x, event.y));
canvas.addEventListener('touchstart', event => startDrag(event.touches[0].clientX, event.touches[0].clientY));
canvas.addEventListener('touchend', event => mouseDown = false);
canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    drag(event.touches[0].clientX, event.touches[0].clientY)
}, {passive: false});


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
}

Simulation
    .with({
        htmlDivId: 'eulerFluidContainer',
        viewport: { aspectRatio: `${fluid.numX} / ${fluid.numY}`, parameterMenuCollapsed: false },
        camera: {
            orthographic: true,
            controls: false
        },
        headUpDisplay: { enabled: false },
        lighting: { enabled: false },
        infoPanel: {
            text:
                '<strong>🍃 Euler fluid</strong><br/>&nbsp;<br/>' +
                '©️ Original idea and software: ' +
                '<a href=\"https://www.matthiasMueller.info/tenMinutePhysics\">Matthias Müller</a></br>' +
                '👉 Use mouse to move obstacle!'
        }
    })
    .runsEvery(3e-2)
    .onStep(() => simulate())
    .bind(fluid.alwaysWith(fluidDomainView))
    .bind(fluid.alwaysWith(fluidDynamicsView))
    .bind(fluid.alwaysWith(streamlinesView))
    .bind(fluid.alwaysWith(velocitiesView))
    .bind(obstacle.alwaysWith(obstacleView))
    .frameSceneOn(fluidDomainView, { padding: 1.0 })
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
        .checked(true)
        .onChange(event => {
            fluidDynamicsView.showPressure = event.target.checked;
            obstacleView.fillColor = event.target.checked ? new Colour(0x131313) : new Colour(0xDDDDDD);
        }).togetherWith(new Checkbox('Smoke')
            .checked(true)
            .onChange(event => fluidDynamicsView.showSmoke = event.target.checked)
            .togetherWith(new Checkbox('Over-relaxation')
                .checked(true)
                .onChange(event =>solver.overRelaxation = solver.overRelaxation === 1.0 ? 1.9 : 1.0)
    )))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Scientific)
        // @ts-ignore
        .onChange(event =>
            fluidDynamicsView.colorMapper = ColorMappers.get(event.target.value, {colorSpace: LinearSRGBColorSpace})))
    .start();

// Keep the existing Canvas 2D field renderer as a transparent layer beneath
// the Three.js canvas, so the obstacle mesh can be rendered above it.
const canvasWrapper = helionDiv.querySelector('.helionCanvasWrapper');
if (canvasWrapper) {
    canvasWrapper.appendChild(canvas);
    Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        zIndex: '0',
        pointerEvents: 'auto'
    });

    const webglCanvas = canvasWrapper.querySelector('.helionCanvas');
    if (webglCanvas)
        Object.assign(webglCanvas.style, {
            zIndex: '1',
            pointerEvents: 'none'
        });
}