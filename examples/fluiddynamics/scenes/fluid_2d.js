import {
    DiscreteScalarField, FluidDynamicsView, Simulation, Vec3
} from "../../../src/index.js";
import {Field} from "../../../src/model/math/fields.js";

const canvas = document.getElementById("myCanvas");
const display = canvas.getContext("2d");

canvas.focus();

const simulationHeight = 1.1;
const canvasScale = canvas.height / simulationHeight;
const simulationWidth = canvas.width / canvasScale;

const U_FIELD = 0; // x-component of velocity
const V_FIELD = 1; // y-component of velocity
const S_FIELD = 2; // smoke field

const SCENE_TYPE = Object.freeze({
    TANK: 0,
    WIND_TUNNEL: 1,
    PAINT: 2,
    HIRES_TUNNEL: 3
})

class Fluid extends Field {
    constructor(density, numX, numY, cellSize) {
        super();
        this.density = density;
        this.numX = numX + 2;
        this.numY = numY + 2;
        this.h = cellSize;

        this._velocityX = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._velocityY = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._pressureField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._obstacleMask = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._smokeField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._smokeField.data.fill(1.0)
    }

    integrate(gravity, dt) {
        if (gravity === 0.0)
            return;

        for (let i = 1; i < this.numX; i++)
            for (let j = 1; j < this.numY - 1; j++)
                if (this._obstacleMask.valueAt(j, i) !== 0.0 && this._obstacleMask.valueAt(j - 1, i) !== 0.0)
                    this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) + gravity * dt);
    }

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

    xVelocityAt(x, y) {
        return this._sampleField(x, y, U_FIELD);
    }

    yVelocityAt(x, y) {
        return this._sampleField(x, y, V_FIELD);
    }

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

    _averageVelocityX(i, j) {
        return (
            this._velocityX.valueAt(j - 1, i) +
            this._velocityX.valueAt(j, i) +
            this._velocityX.valueAt(j - 1, i + 1) +
            this._velocityX.valueAt(j, i + 1)
        ) * 0.25;
    }

    _averageVelocityY(i, j) {
        return (
            this._velocityY.valueAt(j, i - 1) +
            this._velocityY.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i - 1) +
            this._velocityY.valueAt(j + 1, i)
        ) * 0.25;
    }

    calculateVelocityX(i, j, dt) {
        let x = i * this.h;
        let y = (j + .5) * this.h;
        x -= dt * this._velocityX.valueAt(j, i);
        y -= dt * this._averageVelocityY(i, j);
        return this.xVelocityAt(x, y);
    }

    calculateVelocityY(i, j, dt) {
        let x = (i + .5) * this.h;
        let y = j * this.h;
        x -= dt * this._averageVelocityX(i, j);
        y -= dt * this._velocityY.valueAt(j, i);
        return this.yVelocityAt(x, y);
    }

    setObstacle(x, y, reset) {
        let vx = 0.0;
        let vy = 0.0;

        if (!reset) {
            vx = (x - scene.obstacleX) / scene.dt;
            vy = (y - scene.obstacleY) / scene.dt;
        }

        scene.obstacleX = x;
        scene.obstacleY = y;
        const r = scene.obstacleRadius;

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

    get pressureRange() { return this._pressureField.rangeAt(); }

    pressureAt(i, j) { return this._pressureField.valueAt(i, j); }
    smokeAt(i, j) { return this._smokeField.valueAt(i, j); }
    obstacleMaskAt(i, j) { return this._obstacleMask.valueAt(i, j); }

    evolve(solver, dt) {
        solver.step(this, dt);
    }
}

let dt = 1.0 / 120;

const scene = {
    gravity: -9.81,
    frameNr: 0,
    obstacleX: 0.0,
    obstacleY: 0.0,
    obstacleRadius: 0.15,
    paused: false,
    sceneNr: SCENE_TYPE.WIND_TUNNEL,
    fluid: null
};

function updateSmokeFieldInTankScene(fluid, i, j) {
    let smoke = 1.0;	// fluid
    if (i === 0 || i === fluid.numX - 1 || j === 0)
        smoke = 0.0;	// solid
    fluid._obstacleMask.setValueAt(j, i, smoke);
}

function tankScene(fluid) {
    for (let i = 0; i < fluid.numX; i++)
        for (let j = 0; j < fluid.numY; j++)
            updateSmokeFieldInTankScene(fluid, i, j);

    scene.gravity = -9.81;
    fluidDynamicsView.showPressure = true;
    fluidDynamicsView.showSmoke = false;
    fluidDynamicsView.showStreamlines = false;
    fluidDynamicsView.showVelocities = false;
}

function updateSmokeFieldInVortexScene(fluid, i, j) {
    const inwardVelocity = 2.0;
    let smoke = 1.0;	// fluid
    if (i === 0 || j === 0 || j === fluid.numY - 1)
        smoke = 0.0;	// solid
    fluid._obstacleMask.setValueAt(j, i, smoke);

    if (i === 1)
        fluid._velocityX.setValueAt(j, i, inwardVelocity);
}

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
    scene.obstacleRadius = 0.1;
}

function setHighResolution() {
    dt = 1.0 / 120.0;
    solver.numIterations = 100;
    fluidDynamicsView.showPressure = true;
}

function setupScene(sceneNr = 0) {
    scene.sceneNr = sceneNr;
    scene.obstacleRadius = 0.15;
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
    const fluid = scene.fluid = new Fluid(density, numX, numY, dy);

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

let mouseDown = false;

function startDrag(x, y) {
    let bounds = canvas.getBoundingClientRect();

    let mx = x - bounds.left - canvas.clientLeft;
    let my = y - bounds.top - canvas.clientTop;
    mouseDown = true;

    x = mx / canvasScale;
    y = (canvas.height - my) / canvasScale;

    scene.fluid.setObstacle(x, y, true);
}

function drag(x, y) {
    if (mouseDown) {
        let bounds = canvas.getBoundingClientRect();
        let mx = x - bounds.left - canvas.clientLeft;
        let my = y - bounds.top - canvas.clientTop;
        x = mx / canvasScale;
        y = (canvas.height - my) / canvasScale;
        scene.fluid.setObstacle(x, y, false);
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

class Solver {
    constructor({
        numIterations = 100,
        overRelaxation = 1.9
    } = {}) {
        this.numIterations = numIterations;
        this.overRelaxation = overRelaxation;
        this._newVelocityX = new DiscreteScalarField({nx: 0, ny: 0});
        this._newVelocityY = new DiscreteScalarField({nx: 0, ny: 0});
        this._newSmokeField = new DiscreteScalarField({nx: 0, ny: 0});
    }

    _advectVelocityAt(fluid, i, j, dt) {
        if (fluid._obstacleMask.valueAt(j, i) !== 0.0 &&
            fluid._obstacleMask.valueAt(j, i - 1) !== 0.0 &&
            j < fluid.numY - 1)
            this._newVelocityX.setValueAt(j, i, fluid.calculateVelocityX(i, j, dt));

        if (fluid._obstacleMask.valueAt(j, i) !== 0.0 &&
            fluid._obstacleMask.valueAt(j - 1, i) !== 0.0 &&
            i < fluid.numX - 1)
            this._newVelocityY.setValueAt(j, i, fluid.calculateVelocityY(i, j, dt));
    }

    _advectVelocity(fluid, dt) {
        for (let i = 1; i < fluid.numX; i++)
            for (let j = 1; j < fluid.numY; j++)
                this._advectVelocityAt(fluid, i, j, dt);
    }

    _advectSmokeAt(fluid, i, j, dt) {
        if (fluid._obstacleMask.valueAt(j, i) === 0)
            return;

        const u = (fluid._velocityX.valueAt(j, i) + fluid._velocityX.valueAt(j, i + 1)) * 0.5;
        const v = (fluid._velocityY.valueAt(j, i) + fluid._velocityY.valueAt(j + 1, i)) * 0.5;
        const x = (i + .5) * fluid.h - dt * u;
        const y = (j + .5) * fluid.h - dt * v;

        this._newSmokeField.setValueAt(j, i, fluid._sampleField(x, y, S_FIELD));
    }

    _advectSmoke(fluid, dt) {
        this._newSmokeField.data.set(fluid._smokeField.data);
        for (let i = 1; i < fluid.numX - 1; i++)
            for (let j = 1; j < fluid.numY - 1; j++)
                this._advectSmokeAt(fluid, i, j, dt);

        fluid._smokeField.data.set(this._newSmokeField.data);
    }

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

    init(fluid) {
        this._newVelocityX = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newVelocityY = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
        this._newSmokeField = new DiscreteScalarField({nx: fluid.numX, ny: fluid.numY});
    }
}

setupScene(SCENE_TYPE.WIND_TUNNEL);
const solver = new Solver({ numIterations: 40 });
solver.init(scene.fluid);
document.getElementById("overrelaxButton").checked = solver.overRelaxation > 1.0;

// main -------------------------------------------------------
function simulate() {
    scene.frameNr++;

    if (scene.paused)
        return;

    scene.fluid.integrate(scene.gravity, dt);
    scene.fluid.evolve(solver, dt);
}

function update() {
    simulate();
    fluidDynamicsView.synchronizeWith(scene.fluid);
    requestAnimationFrame(update);
}

update();

// Simulation
//     .with({
//         htmlDivId: 'fluid2dContainer',
//         viewport: { aspectRatio: '1/1', parameterMenuCollapsed: true },
//         camera: {
//             position: new Vec3(0, 0, 2),
//             orthographic: true,
//             controls: false
//         },
//         headUpDisplay: false,
//         lighting: { enabled: false }
//     })
//     .runsEvery(0.04)
//     .onStep(() => simulate(), 20, 30)
//     .bind(scene.fluid.alwaysWith(fluidDynamicsView))
//     .start();
// Simulation
//     .with({
//         htmlDivId: "fluid2dContainer",
//         viewport: { aspectRatio: `${scene.fluid.numX} / ${scene.fluid.numY}`, parameterMenuCollapsed: true },
//         camera: {
//             orthographic: true,
//             controls: false
//         },
//         headUpDisplay: { enabled: false },
//         lighting: { enabled: false }
//     })
//     .runsEvery(0.04)
//     .onStep(() => simulate())
//     .bind(scene.fluid.alwaysWith(fluidDynamicsView))
//     .frameSceneOn(fluidDynamicsView, { padding: 1.1 })
//     .start();