import {
    Checkbox,
    DiscreteScalarField, RadialSymmetricBody, RadioGroup, Simulation, Solver, Vec3
} from "../../../src/index.js";
import {Field} from "../../../src/model/math/fields.js";
import {Renderable2D} from "../../../src/view/renderer.js";

const canvas = document.getElementById("myCanvas");
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

//
// F L U I D  S O L V E R
//
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

    /**
     * @param {Fluid} fluid
     * @param {number} dt
     */
    _advectVelocity(fluid, dt) {
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

    /**
     * @param {Fluid} fluid
     * @param {number} dt
     */
    _advectSmoke(fluid, dt) {
        this._newSmokeField.data.set(fluid._smokeField.data);
        for (let i = 1; i < fluid.numX - 1; i++)
            for (let j = 1; j < fluid.numY - 1; j++)
                this._advectSmokeAt(fluid, i, j, dt);

        fluid._smokeField.data.set(this._newSmokeField.data);
    }

    /**
     * @param {Fluid} fluid
     * @param {number} dt
     */
    step(fluid, dt) {
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

    init(/* @type {Fluid} */ fluid) {
        this._newVelocityX = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newVelocityY = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newSmokeField = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
    }
}

//
// F L U I D  M O D E L
//
class Fluid extends Field {
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

    /**
     * @param {number} gravity
     * @param {number} dt
     */
    integrate(gravity, dt) {
        if (gravity === 0.0)
            return;

        for (let i = 1; i < this.numX; i++)
            for (let j = 1; j < this.numY - 1; j++)
                if (this._obstacleMask.valueAt(j, i) !== 0.0 && this._obstacleMask.valueAt(j - 1, i) !== 0.0)
                    this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) + gravity * dt);
    }

    /**
     * @param {number} i
     * @param {number} j
     * @param {number} cp
     * @param {number} overRelaxation
     */
    solveGridBox(i, j, cp, overRelaxation) {
        if (this._obstacleMask.valueAt(j, i) === 0.0)
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
    sampleSmoke(/** @type {number} */ x, /** @type {number} */ y) { return this._sampleField(x, y, S_FIELD); }
    pressureAt(/** @type {number} */ i, /** @type {number} */ j) { return this._pressureField.valueAt(i, j); }
    smokeAt(/** @type {number} */ i, /** @type {number} */ j) { return this._smokeField.valueAt(i, j); }
    obstacleMaskAt(/** @type {number} */ i, /** @type {number} */ j) { return this._obstacleMask.valueAt(i, j); }
    xVelocityAt(/** @type {number} */ i, /** @type {number} */ j) { return this._velocityX.valueAt(i, j); }
    yVelocityAt(/** @type {number} */ i, /** @type {number} */ j) { return this._velocityY.valueAt(i, j); }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} field
     */
    _sampleField(x, y, field) {
        const h = this.h;
        const h1 = 1.0 / h;
        const h2 = 0.5 * h;

        let dx = 0.0;
        let dy = 0.0;
        let f;
        switch (field) {
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

    /**
     * @param {number} i
     * @param {number} j
     */
    _averageVelocityX(i, j) {
        return (
            this._velocityX.valueAt(j - 1, i) +
            this._velocityX.valueAt(j, i) +
            this._velocityX.valueAt(j - 1, i + 1) +
            this._velocityX.valueAt(j, i + 1)
        ) * 0.25;
    }

    /**
     * @param {number} i
     * @param {number} j
     */
    _averageVelocityY(i, j) {
        return (
            this._velocityY.valueAt(j, i - 1) +
            this._velocityY.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i - 1) +
            this._velocityY.valueAt(j + 1, i)
        ) * 0.25;
    }

    /**
     * @param {number} i
     * @param {number} j
     * @param {number} dt
     */
    calculateVelocityX(i, j, dt) {
        let x = i * this.h;
        let y = (j + .5) * this.h;
        x -= dt * this._velocityX.valueAt(j, i);
        y -= dt * this._averageVelocityY(i, j);
        return this.sampleVelocityX(x, y);
    }

    /**
     * @param {number} i
     * @param {number} j
     * @param {number} dt
     */
    calculateVelocityY(i, j, dt) {
        let x = (i + .5) * this.h;
        let y = j * this.h;
        x -= dt * this._averageVelocityX(i, j);
        y -= dt * this._velocityY.valueAt(j, i);
        return this.sampleVelocityY(x, y);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} reset
     */
    setObstacle(x, y, reset) {
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
                this._obstacleMask.setValueAt(j, i, 1.0);

                const dx = (i + 0.5) * this.h - x;
                const dy = (j + 0.5) * this.h - y;

                if (dx * dx + dy * dy < r * r) {
                    this._obstacleMask.setValueAt(j, i, 0.0);
                    if (scene.sceneNr === SCENE_TYPE.PAINT)
                        this._smokeField.setValueAt(j, i, 0.5 + 0.5 * Math.sin(0.1 * scene.frameNr));
                    else
                        this._smokeField.setValueAt(j, i, 1.0);

                    this._velocityX.setValueAt(i, j, vx);
                    this._velocityX.setValueAt(i + 1, j, vx);
                    this._velocityY.setValueAt(i, j, vy);
                    this._velocityY.setValueAt(i, j + 1, vy);
                }
            }
    }

    /**
     * @param {FluidSolver} solver
     * @param {number} dt
     */
    evolve(solver, dt) {
        solver.step(this, dt);
    }
}

//
// V I E W
//
/**
 * @param {number} value
 * @param {number} minVal
 * @param {number} maxVal
 */
function scientificColorCodingFor(value, minVal, maxVal) {
    value = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    value = range === 0.0 ? 0.5 : (value - minVal) / range;
    const num = Math.floor(4 * value);
    const s = 4 * (value - num / 4);

    switch (num) {
        case 0 :
            return [0, 255 * s, 255, 255];
        case 1 :
            return [0, 255, 255 * (1 - s), 255];
        case 2 :
            return [255 * s, 255, 0, 255];
        case 3 :
            return [255, 255 * (1 - s), 0, 255];
        default:
            return [0, 0, 0, 255];
    }
}

class Circle extends Renderable2D {
    constructor({
        display,
        height,
        radiusOffset = 0
    } = {}) {
        super();
        this._height = height;
        this._display = display;
        this._canvasScale = height / simulationHeight;
        this._radiusOffset = radiusOffset;
        this._showPressure = true;
    }

    
    set showPressure(/** @type {boolean} */ value) { this._showPressure = value; }

    _scaleX(/** @type {number} */ x) { return x * this._canvasScale; }

    _scaleY(/** @type {number} */ y) { return this._height - y * this._canvasScale; }

    canBindTo(/** @type {RadialSymmetricBody} */ model) {
        if (model.radius === undefined)
            throw new Error("Circle can only bind to models that have a radius property");
        return true;
    }

    synchronizeWith(/** @type {RadialSymmetricBody} */ obstacle) {
        //this._display.strokeW
        const r = obstacle.radius + this._radiusOffset;
        this._display.fillStyle = this._showPressure ? "#131313" : "#DDDDDD";
        this._display.beginPath();
        this._display.arc(this._scaleX(obstacle.position.x), this._scaleY(obstacle.position.y), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.fill();

        this._display.lineWidth = 3.0;
        this._display.strokeStyle = "#000000";
        this._display.beginPath();
        this._display.arc(this._scaleX(obstacle.position.x), this._scaleY(obstacle.position.y), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.stroke();
        this._display.lineWidth = 1.0;
    }
}

/**
 * Visualizes the pressure/smoke/obstacle combination used by the 2D fluid solver.
 *
 * The pressure field is the model bound to this view. The smoke and obstacle
 * fields are additional state needed to reproduce the fluid visualization.
 */
class FluidDynamicsView extends Renderable2D {
    constructor(display, width, height, scene) {
        super();
        this._imageData = display.getImageData(0, 0, width, height);
        this._display = display;
        this._scene = scene;
        this._showVelocities = false;
        this._showStreamlines = false;
        this._showObstacle = true;
        this._showPressure = true;
        this._showSmoke = true;
        this._height = height;
        this._width = width;
        this._canvasScale = height / simulationHeight;
    }

    _scaleX(/** @type {number} */ x) { return x * this._canvasScale; }

    _scaleY(/** @type {number} */ y) { return this._height - y * this._canvasScale; }

    set showSmoke(/** @type {boolean} */ showSmoke) { this._showSmoke = showSmoke; }
    set showVelocities(/** @type {boolean} */ showVelocities) { this._showVelocities = showVelocities; }
    set showStreamlines(/** @type {boolean} */ showStreamlines) { this._showStreamlines = showStreamlines; }
    set showPressure(/** @type {boolean} */ showPressure) { this._showPressure = showPressure; }

    _doShowObstacle(/** @type {Fluid} */ fluid) {
        //display.strokeW
        const r = obstacle.radius + fluid.h;
        this._display.fillStyle = this._showPressure ? "#131313" : "#DDDDDD";
        this._display.beginPath();
        this._display.arc(this._scaleX(obstacle.position.x), this._scaleY(obstacle.position.y), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.fill();

        this._display.lineWidth = 3.0;
        this._display.strokeStyle = "#000000";
        this._display.beginPath();
        this._display.arc(this._scaleX(obstacle.position.x), this._scaleY(obstacle.position.y), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.stroke();
        this._display.lineWidth = 1.0;
    }

    _doShowVelocities(/** @type {Fluid} */ fluid) {
        this._display.strokeStyle = "#000000";
        const scale = 0.2;
        const h = fluid.h;
        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++) {
                this._display.beginPath();

                const x0 = this._scaleX(i * h);
                const x1 = this._scaleX(i * h + fluid._velocityX.valueAt(j, i) * scale);
                const y = this._scaleY((j + 0.5) * h);

                this._display.moveTo(x0, y);
                this._display.lineTo(x1, y);
                this._display.stroke();

                const x = this._scaleX((i + 0.5) * h);
                const y0 = this._scaleY(j * h);
                const y1 = this._scaleY(j * h + fluid._velocityY.valueAt(j, i) * scale)

                this._display.beginPath();
                this._display.moveTo(x, y0);
                this._display.lineTo(x, y1);
                this._display.stroke();
            }
    }

    _doShowStreamlines(/** @type {Fluid} */ fluid) {
        const numberOfSegments = 15;
        this._display.strokeStyle = "#000000";

        for (let i = 1; i < fluid.numX - 1; i += 5)
            for (let j = 1; j < fluid.numY - 1; j += 5) {
                let x = (i + 0.5) * fluid.h;
                let y = (j + 0.5) * fluid.h;

                this._display.beginPath();
                this._display.moveTo(this._scaleX(x), this._scaleY(y));

                for (let n = 0; n < numberOfSegments; n++) {
                    if (x > fluid.numX * fluid.h)
                        break;

                    x += fluid.sampleVelocityX(x, y) * 0.01;
                    y += fluid.sampleVelocityY(x, y) * 0.01;
                    this._display.lineTo(this._scaleX(x), this._scaleY(y));
                }
                this._display.stroke();
            }
    }

    /**
     * @param {number} i
     * @param {number} j
     * @param {Fluid} fluid
     * @param {{ min: number; max: number; }} pressureRange
     */
    _updateImageDataAt(i, j, fluid, pressureRange) {
        const cellScale = 1.1;
        const h = fluid.h;

        let color = [255, 255, 255, 255];
        const smoke = fluid.smokeAt(j, i);
        if (this._showPressure) {
            color = scientificColorCodingFor(fluid.pressureAt(j, i), pressureRange.min, pressureRange.max);
            if (this._showSmoke) {
                color[0] = Math.max(0.0, color[0] - 255 * smoke);
                color[1] = Math.max(0.0, color[1] - 255 * smoke);
                color[2] = Math.max(0.0, color[2] - 255 * smoke);
            }
        } else if (this._showSmoke) {
            color[0] = 255 * smoke;
            color[1] = 255 * smoke;
            color[2] = 255 * smoke;
            if (this._scene.sceneNr === 2) //SCENE_TYPE.PAINT)
                color = scientificColorCodingFor(smoke, 0.0, 1.0);
        } else if (fluid.obstacleMaskAt(j, i) === 0.0) {
            color[0] = 0;
            color[1] = 0;
            color[2] = 0;
        }

        const x = Math.floor(this._scaleX(i * h));
        const y = Math.floor(this._scaleY((j + 1) * h));
        const cx = Math.floor(this._canvasScale * cellScale * h) + 1;
        const cy = Math.floor(this._canvasScale * cellScale * h) + 1;

        for (let yi = y; yi < y + cy; yi++) {
            let pos = 4 * (yi * this._width + x);

            for (let xi = 0; xi < cx; xi++) {
                this._imageData.data[pos++] = color[0]; // red
                this._imageData.data[pos++] = color[1]; // green
                this._imageData.data[pos++] = color[2]; // blue
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
        this._display.fillStyle = "#FF0000";

        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++)
                this._updateImageDataAt(i, j, fluid, pressureRange);

        this._display.putImageData(this._imageData, 0, 0);

        if (this._showVelocities)
            this._doShowVelocities(fluid);

        if (this._showStreamlines)
            this._doShowStreamlines(fluid);

        if (this._showObstacle)
            this._doShowObstacle(fluid);

        if (this._showPressure) {
            const pressureText = "pressure: " + pressureRange.min.toFixed(0) + " - " + pressureRange.max.toFixed(0) + " N/m";
            this._display.fillStyle = "#A0A0A0";
            this._display.font = "16px Arial";
            this._display.fillText(pressureText, 10, 35);
        }
    }
}

//
// S C E N E
//

let dt = 1.0 / 120;
const fluid = new Fluid();

const scene = {
    gravity: -9.81,
    frameNr: 0,
    paused: false,
    sceneNr: SCENE_TYPE.WIND_TUNNEL,
};

function tankScene(/** @type {Fluid} */ fluid) {
    for (let i = 0; i < fluid.numX; i++)
        for (let j = 0; j < fluid.numY; j++)
            fluid._obstacleMask.setValueAt(j, i, (i === 0 || i === fluid.numX - 1 || j === 0) ? SOLID : FLUID);

    scene.gravity = -9.81;
    fluidDynamicsView.showPressure = true;
    fluidDynamicsView.showSmoke = false;
    fluidDynamicsView.showStreamlines = false;
    fluidDynamicsView.showVelocities = false;
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

/**
 * @param {Fluid} fluid
 * @param {number} sceneNumber
 */
function vortexSheddingScene(fluid, sceneNumber) {
    for (let i = 0; i < fluid.numX; i++)
        for (let j = 0; j < fluid.numY; j++)
            updateSmokeFieldInVortexScene(fluid, i, j);

    const pipeH = 0.1 * fluid.numY;
    const minJ = Math.floor(0.5 * fluid.numY - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * fluid.numY + 0.5 * pipeH);
    for (let j = minJ; j < maxJ; j++)
        fluid._smokeField.data[j] = 0.0;

    fluid.setObstacle(0.4, 0.5, true);

    scene.gravity = 0.0;
    fluidDynamicsView.showPressure = true;
    fluidDynamicsView.showSmoke = true;
    fluidDynamicsView.showStreamlines = false;
    fluidDynamicsView.showVelocities = false;
    if (sceneNumber === SCENE_TYPE.HIRES_TUNNEL)
        setHighResolution();
}

function paintScene() {
    scene.gravity = 0.0;
    solver.overRelaxation = 1.0;

    fluidDynamicsView.showPressure = false;
    fluidDynamicsView.showSmoke = true;
    fluidDynamicsView.showStreamlines = false;
    fluidDynamicsView.showVelocities = false;
    obstacle.radius = 0.1;
}

function setHighResolution() {
    dt = 1.0 / 125.0;
    solver.numIterations = 25;
    fluidDynamicsView.showPressure = true;
}

function setupScene(sceneNr = 0) {
    scene.sceneNr = sceneNr;
    obstacle.radius = 0.15;
    dt = 1.0 / 60.0;

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

    const density = 1000.0;
    fluid.init(density, numX, numY, dy);
    solver.init(fluid);

    if (sceneNr === SCENE_TYPE.TANK)
        tankScene(fluid);
    else if (sceneNr === SCENE_TYPE.WIND_TUNNEL || sceneNr === SCENE_TYPE.HIRES_TUNNEL)
        vortexSheddingScene(fluid, sceneNr);
    else if (sceneNr === SCENE_TYPE.PAINT)
        paintScene();

    document.getElementById("streamButton").checked = fluidDynamicsView.showStreamlines;
    document.getElementById("velocityButton").checked = fluidDynamicsView.showVelocities;
    document.getElementById("pressureButton").checked = fluidDynamicsView.showPressure;
    document.getElementById("smokeButton").checked = fluidDynamicsView.showSmoke;
}

const fluidDynamicsView = new FluidDynamicsView(display, canvas.width, canvas.height, scene);
const obstacleView = new Circle({
    display,
    height: canvas.height,
    radiusOffset: fluid.h
});
let mouseDown = false;

function startDrag(x, y) {
    let bounds = canvas.getBoundingClientRect();

    let mx = x - bounds.left - canvas.clientLeft;
    let my = y - bounds.top - canvas.clientTop;
    mouseDown = true;

    x = mx / canvasScale;
    y = (canvas.height - my) / canvasScale;

    fluid.setObstacle(x, y, true);
}

function drag(x, y) {
    if (mouseDown) {
        let bounds = canvas.getBoundingClientRect();
        let mx = x - bounds.left - canvas.clientLeft;
        let my = y - bounds.top - canvas.clientTop;
        x = mx / canvasScale;
        y = (canvas.height - my) / canvasScale;
        fluid.setObstacle(x, y, false);
    }
}

function endDrag() {
    mouseDown = false;
}

document.getElementById("tankButton").addEventListener("click", () => setupScene(SCENE_TYPE.TANK));
document.getElementById("hiresButton").addEventListener("click", () => setupScene(SCENE_TYPE.HIRES_TUNNEL));
document.getElementById("windTunnel").addEventListener("click", () => setupScene(SCENE_TYPE.WIND_TUNNEL));
document.getElementById("paintButton").addEventListener("click", () => setupScene(SCENE_TYPE.PAINT));
document.getElementById("streamButton").addEventListener("click", event => fluidDynamicsView.showStreamlines = event.target.checked);
document.getElementById("velocityButton").addEventListener("click", event => fluidDynamicsView.showVelocities = event.target.checked);
document.getElementById("pressureButton").addEventListener("click", event => fluidDynamicsView.showPressure = event.target.checked);
document.getElementById("smokeButton").addEventListener("click", event => fluidDynamicsView.showSmoke = event.target.checked);
document.getElementById("overrelaxButton").addEventListener("click", event => solver.overRelaxation = solver.overRelaxation === 1.0 ? 1.9 : 1.0);
canvas.addEventListener('mousedown', event => {
    startDrag(event.x, event.y);
});

canvas.addEventListener('mouseup', event => {
    endDrag();
});

canvas.addEventListener('mousemove', event => {
    drag(event.x, event.y);
});

canvas.addEventListener('touchstart', event => {
    startDrag(event.touches[0].clientX, event.touches[0].clientY)
});

canvas.addEventListener('touchend', event => {
    endDrag()
});

canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    drag(event.touches[0].clientX, event.touches[0].clientY)
}, {passive: false});


document.addEventListener('keydown', event => {
    switch (event.key) {
        case 'p':
            scene.paused = !scene.paused;
            break;
        case 'm':
            scene.paused = false;
            simulate();
            scene.paused = true;
            break;
    }
});

const obstacle = new RadialSymmetricBody({ radius: 0.15 });
const solver = new FluidSolver({ numIterations: 40 });
setupScene(SCENE_TYPE.WIND_TUNNEL);
document.getElementById("overrelaxButton").checked = solver.overRelaxation > 1.0;

// main -------------------------------------------------------
function simulate() {
    scene.frameNr++;

    if (scene.paused)
        return;

    fluid.integrate(scene.gravity, dt);
    fluid.evolve(solver, dt);
}

// function update() {
//     simulate();
//     fluidDynamicsView.synchronizeWith(fluid);
//     requestAnimationFrame(update);
// }
//
// update();

Simulation
    .with({
        htmlDivId: "fluid2dContainer",
        viewport: { aspectRatio: `${fluid.numX} / ${fluid.numY}`, parameterMenuCollapsed: true },
        camera: {
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false }
    })
    .runsEvery(3e-2)
    .onStep(() => simulate())
    .bind(fluid.alwaysWith(fluidDynamicsView))
    //.bind(obstacle.alwaysWith(obstacleView))
    .frameSceneOn(fluidDynamicsView, { padding: 1.01 })
    .append(new RadioGroup()
        .add('Pressure', () => { fluidDynamicsView.showPressure = true; fluidDynamicsView.showSmoke = false; })
        .add('Smoke', () => { fluidDynamicsView.showPressure = false; fluidDynamicsView.showSmoke = true; })
        .add('Pressure+Smoke', () => { fluidDynamicsView.showPressure = true; fluidDynamicsView.showSmoke = true; })
        .add('None (fluid/solid)', () => { fluidDynamicsView.showPressure = false; fluidDynamicsView.showSmoke = false; })
        .checked(0)
    )
    .append(new Checkbox('Velocities')
        .onChange(e => { fluidDynamicsView.showVelocities = e.target.checked; })
    )
    .append(new Checkbox('Streamlines')
        .onChange(e => { fluidDynamicsView.showStreamlines = e.target.checked; })
    )
    .append(new Checkbox('Obstacle')
        .checked(true)
        .onChange(e => { fluidDynamicsView.showObstacle = e.target.checked; })
    )
    .append(new RadioGroup()
        .add('Tank', () => setupScene(SCENE_TYPE.TANK))
        .add('Wind Tunnel', () => setupScene(SCENE_TYPE.WIND_TUNNEL))
        .add('Paint', () => setupScene(SCENE_TYPE.PAINT))
        .add('Hires Tunnel', () => setupScene(SCENE_TYPE.HIRES_TUNNEL))
        .checked(1)
    )
    .append(new Checkbox('Over-relaxation')
        .checked(true)
        .onChange(e => { solver.overRelaxation = e.target.checked ? 1.9 : 1.0; })
    )
    .start();