import {
    DiscreteScalarField,
    Simulation,
    Vec3,
    FluidDynamicsView
} from '../../../src/index.js';

const U_FIELD = 0;
const V_FIELD = 1;
const S_FIELD = 2;

const scene = {
    gravity: -9.81,
    dt: 1.0 / 60.0,
    numIters: 40,
    overRelaxation: 1.9,
    obstacleX: 0.0,
    obstacleY: 0.0,
    obstacleRadius: 0.15,
    frameNr: 0,
    fluid: null
};

class Fluid {
    constructor(density, numX, numY, h) {
        this.density = density;
        this.numX = numX + 2;
        this.numY = numY + 2;
        this.h = h;

        this._velocityX = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._velocityY = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._newVelocityX = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._newVelocityY = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._pressureField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._smokeField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._obstacleField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._newObstacleField = new DiscreteScalarField({nx: this.numX, ny: this.numY});
        this._obstacleField.data.fill(1.0)
    }

    integrate(dt, gravity) {
        if (gravity === 0.0)
            return;

        for (let i = 1; i < this.numX; i++)
            for (let j = 1; j < this.numY - 1; j++)
                if (this._smokeField.valueAt(j, i) !== 0.0 && this._smokeField.valueAt(j - 1, i) !== 0.0)
                    this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) + gravity * dt);
    }

    solveGridBox(i, j, cp) {
        if (this._smokeField.valueAt(j, i) === 0.0)
            return;

        const sx0 = this._smokeField.valueAt(j, i - 1);
        const sx1 = this._smokeField.valueAt(j, i + 1);
        const sy0 = this._smokeField.valueAt(j - 1, i);
        const sy1 = this._smokeField.valueAt(j + 1, i);
        const s = sx0 + sx1 + sy0 + sy1;
        if (s === 0.0)
            return;

        const div =
            this._velocityX.valueAt(j, i + 1) -
            this._velocityX.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i) -
            this._velocityY.valueAt(j, i);

        let p = -div / s;
        p *= scene.overRelaxation;
        this._pressureField.setValueAt(j, i, this._pressureField.valueAt(j, i) + cp * p);

        this._velocityX.setValueAt(j, i, this._velocityX.valueAt(j, i) - sx0 * p);
        this._velocityX.setValueAt(j, i + 1, this._velocityX.valueAt(j, i + 1) + sx1 * p);
        this._velocityY.setValueAt(j, i, this._velocityY.valueAt(j, i) - sy0 * p);
        this._velocityY.setValueAt(j + 1, i, this._velocityY.valueAt(j + 1, i)  + sy1 * p);
    }

    solveIncompressibility(numberOfIterations, dt) {
        const cp = this.density * this.h / dt;
        for (let iter = 0; iter < numberOfIterations; iter++)
            for (let i = 1; i < this.numX - 1; i++)
                for (let j = 1; j < this.numY - 1; j++)
                    this.solveGridBox(i, j, cp);
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
                f = this._obstacleField;
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

    averageVelocityX(i, j) {
        return (
            this._velocityX.valueAt(j - 1, i) +
            this._velocityX.valueAt(j, i) +
            this._velocityX.valueAt(j - 1, i + 1) +
            this._velocityX.valueAt(j, i + 1)
        ) * 0.25;
    }

    averageVelocityY(i, j) {
        return (
            this._velocityY.valueAt(j, i - 1) +
            this._velocityY.valueAt(j, i) +
            this._velocityY.valueAt(j + 1, i - 1) +
            this._velocityY.valueAt(j + 1, i)
        ) * 0.25;
    }

    _calculateVelocityX(i, j, dt) {
        let x = i * this.h;
        let y = (j + .5) * this.h;
        x -= dt * this._velocityX.valueAt(j, i);
        y -= dt * this.averageVelocityY(i, j);
        return this.xVelocityAt(x, y);
    }

    _calculateVelocityY(i, j, dt) {
        let x = (i + .5) * this.h;
        let y = j * this.h;
        x -= dt * this.averageVelocityX(i, j);
        y -= dt * this._velocityY.valueAt(j, i);
        return this.yVelocityAt(x, y);
    }

    _advectVelocityAt(i, j, dt) {
        if (this._smokeField.valueAt(j, i) !== 0.0 && this._smokeField.valueAt(j, i - 1) !== 0.0 && j < this.numY - 1)
            this._newVelocityX.setValueAt(j, i, this._calculateVelocityX(i, j, dt));

        if (this._smokeField.valueAt(j, i) !== 0.0 && this._smokeField.valueAt(j - 1, i) !== 0.0 && i < this.numX - 1)
            this._newVelocityY.setValueAt(j, i, this._calculateVelocityY(i, j, dt));
    }

    advectVelocity(dt) {
        this._newVelocityX.data.set(this._velocityX.data);
        this._newVelocityY.data.set(this._velocityY.data);
        for (let i = 1; i < this.numX; i++)
            for (let j = 1; j < this.numY; j++)
                this._advectVelocityAt(i, j, dt);

        this._velocityX.data.set(this._newVelocityX.data);
        this._velocityY.data.set(this._newVelocityY.data);
    }

    _advectSmokeAt(i, j, dt) {
        if (this._smokeField.valueAt(j, i) === 0)
            return;

        const u = (this._velocityX.valueAt(j, i) + this._velocityX.valueAt(j, i + 1)) * 0.5;
        const v = (this._velocityY.valueAt(j, i) + this._velocityY.valueAt(j + 1, i)) * 0.5;
        const x = (i + .5) * this.h - dt * u;
        const y = (j + .5) * this.h - dt * v;

        this._newObstacleField.setValueAt(j, i, this._sampleField(x, y, S_FIELD));
    }

    advectSmoke(dt) {
        this._newObstacleField.data.set(this._obstacleField.data);
        for (let i = 1; i < this.numX - 1; i++)
            for (let j = 1; j < this.numY - 1; j++)
                this._advectSmokeAt(i, j, dt);

        this._obstacleField.data.set(this._newObstacleField.data);
    }

    // ----------------- end of simulator ------------------------------

    evolve(solver, dt) {
        this.integrate(dt, solver.scene.gravity);
        this._pressureField.reset();
        this.solveIncompressibility(solver.scene.numIters, dt);
        this.extrapolate();
        this.advectVelocity(dt);
        this.advectSmoke(dt);
    }
}

function updateSmokeFieldInVortexScene(fluid, i, j) {
    const inwardVelocity = 2.0;
    let smoke = 1.0;
    if (i === 0 || j === 0 || j === fluid.numY - 1)
        smoke = 0.0;
    fluid._smokeField.setValueAt(j, i, smoke);

    if (i === 1)
        fluid._velocityX.setValueAt(j, i, inwardVelocity);
}

function setObstacle(x, y, reset) {
    let vx = 0.0;
    let vy = 0.0;

    if (!reset) {
        vx = (x - scene.obstacleX) / scene.dt;
        vy = (y - scene.obstacleY) / scene.dt;
    }

    scene.obstacleX = x;
    scene.obstacleY = y;

    const r = scene.obstacleRadius;
    const fluid = scene.fluid;

    for (let i = 1; i < fluid.numX - 2; i++)
        for (let j = 1; j < fluid.numY - 2; j++) {
            fluid._smokeField.setValueAt(j, i, 1.0);

            const dx = (i + 0.5) * fluid.h - x;
            const dy = (j + 0.5) * fluid.h - y;

            if (dx * dx + dy * dy < r * r) {
                fluid._smokeField.setValueAt(j, i, 0.0);
                fluid._obstacleField.setValueAt(j, i, 1.0);
                fluid._velocityX.setValueAt(i, j, vx);
                fluid._velocityX.setValueAt(i + 1, j, vx);
                fluid._velocityY.setValueAt(i, j, vy);
                fluid._velocityY.setValueAt(i, j + 1, vy);
            }
        }
}

function setupScene() {
    const resolution = 100;
    const domainHeight = 1.0;
    const domainWidth = 1.0;
    const dy = domainHeight / resolution;

    const numX = Math.floor(domainWidth / dy);
    const numY = Math.floor(domainHeight / dy);
    scene.fluid = new Fluid(1000.0, numX, numY, dy);

    for (let i = 0; i < scene.fluid.numX; i++)
        for (let j = 0; j < scene.fluid.numY; j++)
            updateSmokeFieldInVortexScene(scene.fluid, i, j);

    const pipeH = 0.1 * scene.fluid.numY;
    const minJ = Math.floor(0.5 * scene.fluid.numY - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * scene.fluid.numY + 0.5 * pipeH);

    for (let j = minJ; j < maxJ; j++)
        scene.fluid._obstacleField.data[j] = 0.0;

    setObstacle(0.4, 0.5, true);
}

setupScene();

const solver = { scene };

const fluidView = new FluidDynamicsView({
    smokeField: scene.fluid._smokeField,
    obstacleField: scene.fluid._obstacleField,
    scale: scene.fluid.h
});

Simulation.with({
    htmlDivId: 'fluid2dContainer',
    viewport: { aspectRatio: '1/1', parameterMenuCollapsed: true },
    camera: {
        position: new Vec3(0, 0, 9),
        orthographic: true,
        controls: false
    },
    headUpDisplay: false,
    lighting: { enabled: false }
})
    .maxOutCpu(() => scene.fluid.evolve(solver, scene.dt), 20, 30)
    .bind(scene.fluid._pressureField.alwaysWith(fluidView))
    .onStep(() => scene.frameNr++)
    .start();

